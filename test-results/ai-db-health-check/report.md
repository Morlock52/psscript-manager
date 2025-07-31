# AI and Database Health Check Report

Generated: 2025-07-28T23:40:29.103Z

## Summary

### Database Health
- Connection: ✅ Connected
- pgvector: ❌ Not Installed
- Database Size: 9.93 MB

### AI Service Health
- Status: ❌ Unhealthy
- Available Endpoints: 0/4

### Data Integrity
- orphaned_embeddings: ✅ 0\n- scripts_without_embeddings: ⚠️ 8\n- scripts_without_analysis: ⚠️ 4

## Detailed Results

### AI Tables Status
- **script_embeddings**: ✅ 0 rows, 0 bytes\n- **script_analysis**: ✅ 0 rows, 8192 bytes\n- **agent_state**: ✅ 0 rows, 0 bytes\n- **conversation_history**: ✅ 0 rows, 0 bytes\n- **tool_execution_results**: ✅ 0 rows, 0 bytes\n- **chat_history**: ✅ 0 rows, 0 bytes

### Performance Metrics
- Connection Pool: active: 1
- Cache Hit Rates: index hit rate: 73.68%, table hit rate: 91.53%

## Recommendations

### CRITICAL - ai
**Issue:** pgvector extension not installed
**Recommendation:** Install pgvector extension: brew install pgvector (macOS) or follow pgvector installation guide
\n### HIGH - ai
**Issue:** 8 scripts without embeddings
**Recommendation:** Generate embeddings for scripts without them to enable AI features
\n### MEDIUM - performance
**Issue:** Low index cache hit rate: 73.68%
**Recommendation:** Consider increasing shared_buffers or adding more indexes
\n### CRITICAL - ai
**Issue:** AI service is not healthy
**Recommendation:** Check AI service logs and ensure it is running properly


## Next Steps

1. Address any critical recommendations first
2. Monitor data integrity issues regularly
3. Review performance metrics and optimize as needed
4. Ensure AI service is running and accessible
