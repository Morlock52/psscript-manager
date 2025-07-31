const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Database connection parameters
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'psscript';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Create results directory
const resultsDir = path.join(__dirname, 'test-results', 'ai-db-health-check');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const results = {
  timestamp: new Date().toISOString(),
  database: {
    connection: null,
    pgvector: null,
    tables: [],
    indexes: [],
    aiTables: [],
    dataIntegrity: []
  },
  ai: {
    serviceHealth: null,
    endpoints: [],
    embeddings: null,
    vectorSearch: null
  },
  performance: {
    queries: [],
    connectionPool: null,
    cacheHitRates: null
  },
  recommendations: []
};

async function checkDatabaseConnection() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD
  });

  try {
    console.log('Checking database connection...');
    await client.connect();
    
    const result = await client.query('SELECT version(), pg_database_size(current_database()) as db_size');
    results.database.connection = {
      status: 'connected',
      version: result.rows[0].version,
      dbSize: result.rows[0].db_size
    };
    console.log('✅ Database connection successful');
    
    return client;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    results.database.connection = {
      status: 'failed',
      error: error.message
    };
    throw error;
  }
}

async function checkPgVectorExtension(client) {
  try {
    console.log('Checking pgvector extension...');
    
    // Check if extension exists
    const extResult = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);
    
    if (extResult.rows.length === 0) {
      results.database.pgvector = {
        status: 'not_installed',
        message: 'pgvector extension is not installed'
      };
      console.log('❌ pgvector extension not installed');
      return false;
    }
    
    // Check vector indexes
    const indexResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE indexdef LIKE '%vector%'
      ORDER BY tablename, indexname;
    `);
    
    results.database.pgvector = {
      status: 'installed',
      vectorIndexes: indexResult.rows
    };
    
    console.log(`✅ pgvector extension installed with ${indexResult.rows.length} vector indexes`);
    return true;
  } catch (error) {
    console.error('❌ Error checking pgvector:', error.message);
    results.database.pgvector = {
      status: 'error',
      error: error.message
    };
    return false;
  }
}

async function checkAITables(client) {
  try {
    console.log('Checking AI-related tables...');
    
    const aiTables = [
      'script_embeddings',
      'script_analysis',
      'agent_state',
      'conversation_history',
      'tool_execution_results',
      'chat_history'
    ];
    
    for (const tableName of aiTables) {
      const tableResult = await client.query(`
        SELECT 
          c.relname as table_name,
          pg_size_pretty(pg_relation_size(c.oid)) as size,
          n_live_tup as row_count,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_analyze
        FROM pg_stat_user_tables t
        JOIN pg_class c ON c.relname = t.relname
        WHERE t.relname = $1
      `, [tableName]);
      
      if (tableResult.rows.length > 0) {
        const tableInfo = tableResult.rows[0];
        
        // Get column information
        const columnResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        results.database.aiTables.push({
          name: tableName,
          exists: true,
          ...tableInfo,
          columns: columnResult.rows
        });
        
        console.log(`✅ Table ${tableName}: ${tableInfo.row_count} rows, ${tableInfo.size}`);
      } else {
        results.database.aiTables.push({
          name: tableName,
          exists: false
        });
        console.log(`⚠️  Table ${tableName} does not exist`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking AI tables:', error.message);
  }
}

async function checkDataIntegrity(client) {
  try {
    console.log('Checking data integrity...');
    
    // Check for orphaned embeddings
    const orphanedEmbeddings = await client.query(`
      SELECT COUNT(*) as count
      FROM script_embeddings se
      LEFT JOIN scripts s ON se.script_id = s.id
      WHERE s.id IS NULL
    `);
    
    results.database.dataIntegrity.push({
      check: 'orphaned_embeddings',
      count: parseInt(orphanedEmbeddings.rows[0].count),
      status: orphanedEmbeddings.rows[0].count === '0' ? 'ok' : 'warning'
    });
    
    // Check for scripts without embeddings
    const scriptsWithoutEmbeddings = await client.query(`
      SELECT COUNT(*) as count
      FROM scripts s
      LEFT JOIN script_embeddings se ON s.id = se.script_id
      WHERE se.id IS NULL
    `);
    
    results.database.dataIntegrity.push({
      check: 'scripts_without_embeddings',
      count: parseInt(scriptsWithoutEmbeddings.rows[0].count),
      status: scriptsWithoutEmbeddings.rows[0].count === '0' ? 'ok' : 'warning'
    });
    
    // Check for scripts without analysis
    const scriptsWithoutAnalysis = await client.query(`
      SELECT COUNT(*) as count
      FROM scripts s
      LEFT JOIN script_analysis sa ON s.id = sa.script_id
      WHERE sa.id IS NULL
    `);
    
    results.database.dataIntegrity.push({
      check: 'scripts_without_analysis',
      count: parseInt(scriptsWithoutAnalysis.rows[0].count),
      status: scriptsWithoutAnalysis.rows[0].count === '0' ? 'ok' : 'warning'
    });
    
    // Check embedding dimensions
    const embeddingDimensions = await client.query(`
      SELECT 
        script_id,
        vector_dims(embedding) as dimensions
      FROM script_embeddings
      WHERE embedding IS NOT NULL
      LIMIT 10
    `);
    
    const uniqueDimensions = [...new Set(embeddingDimensions.rows.map(r => r.dimensions))];
    results.database.dataIntegrity.push({
      check: 'embedding_dimensions',
      dimensions: uniqueDimensions,
      status: uniqueDimensions.length === 1 && uniqueDimensions[0] === 1536 ? 'ok' : 'warning'
    });
    
    console.log('✅ Data integrity checks completed');
  } catch (error) {
    console.error('❌ Error checking data integrity:', error.message);
  }
}

async function checkPerformance(client) {
  try {
    console.log('Checking database performance...');
    
    // Check slow queries
    const slowQueries = await client.query(`
      SELECT 
        calls,
        mean_exec_time,
        total_exec_time,
        query
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `).catch(() => ({ rows: [] })); // pg_stat_statements might not be enabled
    
    results.performance.queries = slowQueries.rows;
    
    // Check connection pool
    const connectionPool = await client.query(`
      SELECT 
        state,
        COUNT(*) as count,
        MAX(EXTRACT(epoch FROM now() - state_change)) as max_duration_seconds
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `);
    
    results.performance.connectionPool = connectionPool.rows;
    
    // Check cache hit rates
    const cacheHitRates = await client.query(`
      SELECT 
        'index hit rate' as name,
        sum(idx_blks_hit) / nullif(sum(idx_blks_hit) + sum(idx_blks_read), 0) as ratio
      FROM pg_statio_user_indexes
      UNION ALL
      SELECT 
        'table hit rate' as name,
        sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) as ratio
      FROM pg_statio_user_tables
    `);
    
    results.performance.cacheHitRates = cacheHitRates.rows;
    
    console.log('✅ Performance checks completed');
  } catch (error) {
    console.error('❌ Error checking performance:', error.message);
  }
}

async function checkAIService() {
  try {
    console.log('Checking AI service health...');
    
    // Check health endpoint
    try {
      const healthResponse = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
      results.ai.serviceHealth = {
        status: 'healthy',
        response: healthResponse.data
      };
      console.log('✅ AI service is healthy');
    } catch (error) {
      results.ai.serviceHealth = {
        status: 'unhealthy',
        error: error.message
      };
      console.log('❌ AI service is not responding');
    }
    
    // Check AI endpoints
    const endpoints = [
      { path: '/analyze-script', method: 'POST', description: 'Script analysis' },
      { path: '/generate-embedding', method: 'POST', description: 'Embedding generation' },
      { path: '/search-similar', method: 'POST', description: 'Vector similarity search' },
      { path: '/chat', method: 'POST', description: 'AI chat' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.options(`${AI_SERVICE_URL}${endpoint.path}`, { timeout: 3000 });
        results.ai.endpoints.push({
          ...endpoint,
          status: 'available',
          headers: response.headers
        });
      } catch (error) {
        results.ai.endpoints.push({
          ...endpoint,
          status: 'unavailable',
          error: error.message
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking AI service:', error.message);
  }
}

async function generateRecommendations() {
  console.log('Generating recommendations...');
  
  // Database connection recommendations
  if (results.database.connection?.status !== 'connected') {
    results.recommendations.push({
      severity: 'critical',
      category: 'database',
      issue: 'Database connection failed',
      recommendation: 'Ensure PostgreSQL is running and connection parameters are correct'
    });
  }
  
  // pgvector recommendations
  if (results.database.pgvector?.status !== 'installed') {
    results.recommendations.push({
      severity: 'critical',
      category: 'ai',
      issue: 'pgvector extension not installed',
      recommendation: 'Install pgvector extension: brew install pgvector (macOS) or follow pgvector installation guide'
    });
  }
  
  // Data integrity recommendations
  const orphanedEmbeddings = results.database.dataIntegrity.find(d => d.check === 'orphaned_embeddings');
  if (orphanedEmbeddings?.count > 0) {
    results.recommendations.push({
      severity: 'medium',
      category: 'data_integrity',
      issue: `${orphanedEmbeddings.count} orphaned embeddings found`,
      recommendation: 'Clean up orphaned embeddings: DELETE FROM script_embeddings WHERE script_id NOT IN (SELECT id FROM scripts)'
    });
  }
  
  const scriptsWithoutEmbeddings = results.database.dataIntegrity.find(d => d.check === 'scripts_without_embeddings');
  if (scriptsWithoutEmbeddings?.count > 0) {
    results.recommendations.push({
      severity: 'high',
      category: 'ai',
      issue: `${scriptsWithoutEmbeddings.count} scripts without embeddings`,
      recommendation: 'Generate embeddings for scripts without them to enable AI features'
    });
  }
  
  // Performance recommendations
  const idleConnections = results.performance.connectionPool?.find(p => p.state === 'idle');
  if (idleConnections?.count > 20) {
    results.recommendations.push({
      severity: 'low',
      category: 'performance',
      issue: `${idleConnections.count} idle connections`,
      recommendation: 'Consider reducing connection pool size or idle timeout'
    });
  }
  
  const cacheHitRate = results.performance.cacheHitRates?.find(c => c.name === 'index hit rate');
  if (cacheHitRate?.ratio < 0.9) {
    results.recommendations.push({
      severity: 'medium',
      category: 'performance',
      issue: `Low index cache hit rate: ${(cacheHitRate.ratio * 100).toFixed(2)}%`,
      recommendation: 'Consider increasing shared_buffers or adding more indexes'
    });
  }
  
  // AI service recommendations
  if (results.ai.serviceHealth?.status !== 'healthy') {
    results.recommendations.push({
      severity: 'critical',
      category: 'ai',
      issue: 'AI service is not healthy',
      recommendation: 'Check AI service logs and ensure it is running properly'
    });
  }
}

async function createReport() {
  const report = `# AI and Database Health Check Report

Generated: ${results.timestamp}

## Summary

### Database Health
- Connection: ${results.database.connection?.status === 'connected' ? '✅ Connected' : '❌ Failed'}
- pgvector: ${results.database.pgvector?.status === 'installed' ? '✅ Installed' : '❌ Not Installed'}
- Database Size: ${results.database.connection?.dbSize ? (results.database.connection.dbSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}

### AI Service Health
- Status: ${results.ai.serviceHealth?.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}
- Available Endpoints: ${results.ai.endpoints.filter(e => e.status === 'available').length}/${results.ai.endpoints.length}

### Data Integrity
${results.database.dataIntegrity.map(check => 
  `- ${check.check}: ${check.status === 'ok' ? '✅' : '⚠️'} ${check.count !== undefined ? check.count : ''}`
).join('\\n')}

## Detailed Results

### AI Tables Status
${results.database.aiTables.map(table => 
  `- **${table.name}**: ${table.exists ? `✅ ${table.row_count} rows, ${table.size}` : '❌ Not Found'}`
).join('\\n')}

### Performance Metrics
- Connection Pool: ${results.performance.connectionPool?.map(p => `${p.state}: ${p.count}`).join(', ') || 'N/A'}
- Cache Hit Rates: ${results.performance.cacheHitRates?.map(c => `${c.name}: ${(c.ratio * 100).toFixed(2)}%`).join(', ') || 'N/A'}

## Recommendations

${results.recommendations.length > 0 ? 
  results.recommendations.map(rec => 
    `### ${rec.severity.toUpperCase()} - ${rec.category}
**Issue:** ${rec.issue}
**Recommendation:** ${rec.recommendation}
`).join('\\n') : 
  'No recommendations at this time. System is healthy! ✅'}

## Next Steps

1. Address any critical recommendations first
2. Monitor data integrity issues regularly
3. Review performance metrics and optimize as needed
4. Ensure AI service is running and accessible
`;

  fs.writeFileSync(path.join(resultsDir, 'report.md'), report);
  fs.writeFileSync(path.join(resultsDir, 'results.json'), JSON.stringify(results, null, 2));
  
  console.log(`\nReport saved to: ${path.join(resultsDir, 'report.md')}`);
}

async function runHealthCheck() {
  console.log('Starting AI and Database Health Check...\n');
  
  let client;
  try {
    client = await checkDatabaseConnection();
    await checkPgVectorExtension(client);
    await checkAITables(client);
    await checkDataIntegrity(client);
    await checkPerformance(client);
    await checkAIService();
    await generateRecommendations();
    await createReport();
    
    console.log('\n✅ Health check completed successfully!');
    console.log(`Check the full report at: ${path.join(resultsDir, 'report.md')}`);
    
    // Print summary
    console.log('\n=== Summary ===');
    console.log(`Critical Issues: ${results.recommendations.filter(r => r.severity === 'critical').length}`);
    console.log(`High Priority Issues: ${results.recommendations.filter(r => r.severity === 'high').length}`);
    console.log(`Medium Priority Issues: ${results.recommendations.filter(r => r.severity === 'medium').length}`);
    console.log(`Low Priority Issues: ${results.recommendations.filter(r => r.severity === 'low').length}`);
    
  } catch (error) {
    console.error('Fatal error during health check:', error.message);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run the health check
runHealthCheck().catch(console.error);