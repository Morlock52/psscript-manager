# PSScript Manager - Advanced AI Features (2025 Edition)

## Overview

PSScript Manager has been upgraded with state-of-the-art AI capabilities using the latest models from OpenAI. These features provide superior PowerShell script analysis, semantic search, and intelligent assistance.

## Key Upgrades

### 1. **Text-Embedding-3-Large Model**
- Upgraded from `text-embedding-ada-002` (1536 dimensions) to `text-embedding-3-large` (3072 dimensions)
- Provides superior semantic understanding and more accurate similarity matching
- Better capture of nuanced PowerShell patterns and concepts

### 2. **GPT-4 Turbo Preview**
- Updated from GPT-4 to GPT-4-turbo-preview for faster and more accurate analysis
- JSON mode enabled for consistent structured responses
- Enhanced PowerShell script understanding

## New Features

### 1. **Semantic Search** (`/ai/features` → Semantic Search tab)
- Natural language search for PowerShell scripts
- Combines vector embeddings with text search for optimal results
- Features:
  - Category filtering
  - Adjustable similarity threshold
  - Real-time search performance metrics
  - Hybrid search combining semantic and text matching

### 2. **RAG Assistant** (`/ai/features` → RAG Assistant tab)
- Retrieval-Augmented Generation for PowerShell expertise
- Provides accurate, context-aware answers about PowerShell patterns
- Features:
  - Retrieves relevant script examples from your library
  - Generates comprehensive responses with citations
  - Supports additional context for specific requirements
  - Shows source scripts used for answer generation

### 3. **Similar Scripts** (Available in Script Detail pages)
- Enhanced similarity search using vector embeddings
- Visual similarity scores with progress bars
- Features:
  - Real-time similarity calculation
  - Categorized similarity levels (Very Similar, Similar, Somewhat Similar)
  - Quick navigation to similar scripts

### 4. **Embeddings Management** (`/ai/features` → Embeddings Management tab)
- Monitor and manage vector embeddings
- Features:
  - View embedding statistics
  - Check which scripts need embedding updates
  - Regenerate embeddings with latest models
  - Track embedding generation progress

## API Endpoints

### Advanced AI Endpoints
- `POST /api/ai/advanced/rag` - Retrieval-Augmented Generation
- `POST /api/ai/advanced/semantic-search` - Semantic script search
- `POST /api/ai/advanced/similarity-search` - Find similar scripts
- `GET /api/ai/advanced/embeddings/status` - Check embeddings status
- `POST /api/ai/advanced/regenerate-embeddings` - Regenerate embeddings

### Python AI Service Endpoints
- `POST /rag` - RAG processing
- `POST /semantic-search` - Vector search
- `POST /similarity-search` - Similarity matching
- `GET /embeddings/status` - Embeddings statistics

## Database Schema Updates

### Migration: `002_upgrade_embeddings_to_3072.sql`
- Updates vector columns from 1536 to 3072 dimensions
- Adds embedding model tracking
- Creates optimized HNSW indexes for faster similarity search
- Updates hybrid search function for new dimensions

### New Columns
- `embedding_model` - Tracks which model generated the embedding
- `embedding_dimensions` - Stores embedding dimension size

## Performance Optimizations

### Vector Search
- HNSW (Hierarchical Navigable Small World) indexes for faster similarity search
- Optimized parameters: `m=16, ef_construction=64`

### Hybrid Search
- Configurable weights for text vs. vector search
- Default: 30% text weight, 70% vector weight
- Category filtering support

## Usage Examples

### Semantic Search
```typescript
// Search for Active Directory scripts
const results = await api.post('/api/ai/advanced/semantic-search', {
  query: 'scripts that manage Active Directory users',
  limit: 10,
  threshold: 0.7,
  category: 'Active Directory'
});
```

### RAG Assistant
```typescript
// Ask about PowerShell best practices
const response = await api.post('/api/ai/advanced/rag', {
  query: 'How do I safely handle credentials in PowerShell scripts?',
  context: 'Need to work with Azure Key Vault',
  limit: 5
});
```

### Find Similar Scripts
```typescript
// Find scripts similar to script ID 123
const similar = await api.post('/api/ai/advanced/similarity-search', {
  script_id: 123,
  limit: 5,
  threshold: 0.7
});
```

## Best Practices

1. **Regenerate Embeddings**: After upgrading, regenerate all script embeddings to use the new model
2. **Regular Updates**: Periodically regenerate embeddings for new scripts
3. **Threshold Tuning**: Adjust similarity thresholds based on your use case
4. **Category Usage**: Use categories to improve search relevance

## Troubleshooting

### Missing Embeddings
If scripts are missing embeddings:
1. Check embeddings status at `/ai/features` → Embeddings Management
2. Click "Regenerate All Embeddings" to update
3. Monitor progress in the UI

### Search Performance
If searches are slow:
1. Ensure HNSW indexes are created (check migration logs)
2. Consider reducing the search limit
3. Use category filters to narrow results

### Database Compatibility
Requires PostgreSQL with pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Future Enhancements

- Support for GPT-4.5 when released
- Multi-modal analysis for script screenshots
- Advanced code generation with RAG context
- Collaborative filtering for script recommendations