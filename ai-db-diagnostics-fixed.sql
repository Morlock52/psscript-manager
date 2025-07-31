-- PSScript AI and Database Comprehensive Diagnostics (Fixed)
-- ==========================================================

-- 1. Database Health Overview
-- --------------------------
SELECT '=== DATABASE HEALTH OVERVIEW ===' as section;

SELECT 
    'Database Version' as metric,
    version() as value
UNION ALL
SELECT 
    'Database Size',
    pg_size_pretty(pg_database_size(current_database()))
UNION ALL
SELECT 
    'Active Connections',
    count(*)::text
FROM pg_stat_activity
WHERE datname = current_database()
UNION ALL
SELECT 
    'Max Connections',
    current_setting('max_connections')
UNION ALL
SELECT 
    'Shared Buffers',
    current_setting('shared_buffers')
UNION ALL
SELECT 
    'Work Memory',
    current_setting('work_mem');

-- 2. pgvector Extension Status
-- ----------------------------
SELECT '=== PGVECTOR EXTENSION STATUS ===' as section;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN 'INSTALLED ✅'
        ELSE 'NOT INSTALLED ❌'
    END as pgvector_status;

-- 3. AI-Related Tables Health
-- ---------------------------
SELECT '=== AI TABLES HEALTH ===' as section;

WITH ai_tables AS (
    SELECT * FROM (VALUES 
        ('script_embeddings'),
        ('script_analysis'),
        ('agent_state'),
        ('conversation_history'),
        ('tool_execution_results'),
        ('chat_history')
    ) AS t(table_name)
)
SELECT 
    at.table_name,
    CASE 
        WHEN pst.schemaname IS NOT NULL THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END as status,
    COALESCE(pst.n_live_tup::text, '0') as row_count,
    COALESCE(pg_size_pretty(pg_total_relation_size(pst.schemaname||'.'||pst.tablename)), 'N/A') as size,
    COALESCE(pst.n_dead_tup::text, '0') as dead_tuples,
    CASE 
        WHEN pst.n_dead_tup > 0 AND pst.n_live_tup > 0 
             AND pst.n_dead_tup::float / pst.n_live_tup > 0.1 
        THEN 'NEEDS VACUUM ⚠️'
        ELSE 'OK'
    END as maintenance_status
FROM ai_tables at
LEFT JOIN pg_stat_user_tables pst ON pst.tablename = at.table_name
ORDER BY at.table_name;

-- 4. Data Integrity Checks
-- ------------------------
SELECT '=== DATA INTEGRITY CHECKS ===' as section;

-- Check for orphaned embeddings
WITH orphaned_check AS (
    SELECT 
        'Orphaned Embeddings' as check_name,
        COUNT(*) as issue_count
    FROM script_embeddings se
    LEFT JOIN scripts s ON se.script_id = s.id
    WHERE s.id IS NULL
),
-- Check for scripts without embeddings
missing_embeddings AS (
    SELECT 
        'Scripts Without Embeddings' as check_name,
        COUNT(*) as issue_count
    FROM scripts s
    LEFT JOIN script_embeddings se ON s.id = se.script_id
    WHERE se.id IS NULL
),
-- Check for scripts without analysis
missing_analysis AS (
    SELECT 
        'Scripts Without Analysis' as check_name,
        COUNT(*) as issue_count
    FROM scripts s
    LEFT JOIN script_analysis sa ON s.id = sa.script_id
    WHERE sa.id IS NULL
),
-- Check for duplicate file hashes
duplicate_hashes AS (
    SELECT 
        'Duplicate File Hashes' as check_name,
        COUNT(*) as issue_count
    FROM (
        SELECT file_hash, COUNT(*) as cnt
        FROM scripts
        WHERE file_hash IS NOT NULL
        GROUP BY file_hash
        HAVING COUNT(*) > 1
    ) dups
)
SELECT * FROM orphaned_check
UNION ALL
SELECT * FROM missing_embeddings
UNION ALL
SELECT * FROM missing_analysis
UNION ALL
SELECT * FROM duplicate_hashes
ORDER BY issue_count DESC;

-- 5. Vector Index Performance
-- ---------------------------
SELECT '=== VECTOR INDEX PERFORMANCE ===' as section;

SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans_count,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname LIKE '%embedding%' OR indexname LIKE '%vector%'
ORDER BY idx_scan DESC;

-- 6. Query Performance Analysis
-- -----------------------------
SELECT '=== QUERY PERFORMANCE ===' as section;

-- Table scan vs index scan ratio
SELECT 
    schemaname,
    tablename,
    seq_scan,
    idx_scan,
    CASE 
        WHEN (seq_scan + idx_scan) > 0 
        THEN (100.0 * idx_scan / (seq_scan + idx_scan))::numeric(5,2)
        ELSE 0
    END as index_usage_percent,
    CASE 
        WHEN seq_scan > idx_scan * 10 AND n_live_tup > 1000
        THEN 'NEEDS INDEX ⚠️'
        ELSE 'OK'
    END as recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC
LIMIT 10;

-- 7. Connection Pool Analysis
-- ---------------------------
SELECT '=== CONNECTION POOL ANALYSIS ===' as section;

SELECT 
    state,
    count(*) as connection_count,
    AVG(EXTRACT(epoch FROM now() - state_change))::numeric(10,2) as avg_duration_seconds,
    MAX(EXTRACT(epoch FROM now() - state_change))::integer as max_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;

-- 8. Cache Hit Rates
-- ------------------
SELECT '=== CACHE HIT RATES ===' as section;

WITH cache_stats AS (
    SELECT 
        'Index Cache Hit Rate' as cache_type,
        sum(idx_blks_hit)::float / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) as hit_rate
    FROM pg_statio_user_indexes
    UNION ALL
    SELECT 
        'Table Cache Hit Rate' as cache_type,
        sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) as hit_rate
    FROM pg_statio_user_tables
)
SELECT 
    cache_type,
    (hit_rate * 100)::numeric(5,2) as hit_rate_percent,
    CASE 
        WHEN hit_rate < 0.9 THEN 'LOW - Consider increasing shared_buffers ⚠️'
        ELSE 'GOOD ✅'
    END as status
FROM cache_stats;

-- 9. AI Feature Usage Statistics
-- ------------------------------
SELECT '=== AI FEATURE USAGE ===' as section;

-- Scripts with embeddings
SELECT 
    'Scripts with Embeddings' as metric,
    COUNT(*) as count,
    (100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM scripts), 0))::numeric(5,2) as percentage
FROM scripts s
INNER JOIN script_embeddings se ON s.id = se.script_id
UNION ALL
-- Scripts with analysis
SELECT 
    'Scripts with Analysis' as metric,
    COUNT(*) as count,
    (100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM scripts), 0))::numeric(5,2) as percentage
FROM scripts s
INNER JOIN script_analysis sa ON s.id = sa.script_id
UNION ALL
-- Agent conversations
SELECT 
    'Agent Conversations' as metric,
    COUNT(DISTINCT conversation_id) as count,
    0 as percentage
FROM conversation_history
UNION ALL
-- Tool executions
SELECT 
    'Tool Executions' as metric,
    COUNT(*) as count,
    0 as percentage
FROM tool_execution_results;

-- 10. Recent AI Activity
-- ----------------------
SELECT '=== RECENT AI ACTIVITY ===' as section;

-- Recent script analyses
SELECT 
    'Recent Script Analyses (Last 24h)' as activity,
    COUNT(*) as count
FROM script_analysis
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
-- Recent conversations
SELECT 
    'Recent Conversations (Last 24h)' as activity,
    COUNT(DISTINCT conversation_id) as count
FROM conversation_history
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
-- Recent tool executions
SELECT 
    'Recent Tool Executions (Last 24h)' as activity,
    COUNT(*) as count
FROM tool_execution_results
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 11. Storage Analysis
-- --------------------
SELECT '=== STORAGE ANALYSIS ===' as section;

SELECT 
    nspname AS schema_name,
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(C.oid)) AS total_size,
    pg_size_pretty(pg_relation_size(C.oid)) AS table_size,
    pg_size_pretty(pg_total_relation_size(C.oid) - pg_relation_size(C.oid)) AS indexes_size
FROM pg_class C
LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
WHERE nspname = 'public' 
    AND C.relkind = 'r'
ORDER BY pg_total_relation_size(C.oid) DESC
LIMIT 10;

-- 12. Recommendations Summary
-- ---------------------------
SELECT '=== RECOMMENDATIONS SUMMARY ===' as section;

WITH recommendations AS (
    -- pgvector check
    SELECT 
        'CRITICAL' as severity,
        'Install pgvector extension' as recommendation
    WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
    
    UNION ALL
    
    -- Missing embeddings
    SELECT 
        'HIGH' as severity,
        'Generate embeddings for ' || COUNT(*) || ' scripts' as recommendation
    FROM scripts s
    LEFT JOIN script_embeddings se ON s.id = se.script_id
    WHERE se.id IS NULL
    HAVING COUNT(*) > 0
    
    UNION ALL
    
    -- Missing analysis
    SELECT 
        'MEDIUM' as severity,
        'Generate analysis for ' || COUNT(*) || ' scripts' as recommendation
    FROM scripts s
    LEFT JOIN script_analysis sa ON s.id = sa.script_id
    WHERE sa.id IS NULL
    HAVING COUNT(*) > 0
    
    UNION ALL
    
    -- Tables needing vacuum
    SELECT 
        'MEDIUM' as severity,
        'VACUUM table: ' || tablename as recommendation
    FROM pg_stat_user_tables
    WHERE n_dead_tup > 1000 
        AND n_live_tup > 0 
        AND n_dead_tup::float / n_live_tup > 0.1
    
    UNION ALL
    
    -- Low cache hit rate
    SELECT 
        'MEDIUM' as severity,
        'Increase shared_buffers - Index cache hit rate is ' || 
        (sum(idx_blks_hit)::float / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) * 100)::numeric(5,2) || '%' as recommendation
    FROM pg_statio_user_indexes
    HAVING sum(idx_blks_hit)::float / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) < 0.9
)
SELECT 
    severity,
    recommendation
FROM recommendations
ORDER BY 
    CASE severity 
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        ELSE 4
    END;