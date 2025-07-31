import { sequelize } from '../database/connection';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger';
import { cache } from '../index';
import axios from 'axios';

interface HybridSearchResult {
  script_id: number;
  title: string;
  description: string;
  text_rank: number;
  vector_similarity: number;
  combined_score: number;
}

interface SearchOptions {
  textWeight?: number;
  vectorWeight?: number;
  limit?: number;
  useCache?: boolean;
}

class HybridSearchService {
  private readonly AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Perform hybrid search combining text and vector similarity
   */
  async search(
    query: string, 
    options: SearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const {
      textWeight = 0.3,
      vectorWeight = 0.7,
      limit = 10,
      useCache = true
    } = options;

    // Check cache first
    const cacheKey = `hybrid_search:${query}:${textWeight}:${vectorWeight}:${limit}`;
    if (useCache) {
      const cached = cache.get<HybridSearchResult[]>(cacheKey);
      if (cached) {
        logger.info('Hybrid search cache hit', { query });
        return cached;
      }
    }

    try {
      // Get embedding for the query
      const embedding = await this.getQueryEmbedding(query);
      
      // Format embedding as PostgreSQL vector
      const vectorString = `[${embedding.join(',')}]`;
      
      // Perform hybrid search
      const results = await sequelize.query<HybridSearchResult>(
        `SELECT * FROM hybrid_script_search($1, $2::vector, $3, $4, $5)`,
        {
          bind: [query, vectorString, textWeight, vectorWeight, limit],
          type: QueryTypes.SELECT
        }
      );

      // Cache results
      if (useCache && results.length > 0) {
        cache.set(cacheKey, results, this.CACHE_TTL);
      }

      logger.info('Hybrid search completed', { 
        query, 
        resultsCount: results.length,
        topScore: results[0]?.combined_score 
      });

      return results;
    } catch (error) {
      logger.error('Hybrid search error', { 
        error: error instanceof Error ? error.message : error, 
        stack: error instanceof Error ? error.stack : undefined,
        query 
      });
      throw new Error(`Failed to perform hybrid search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get embedding vector for a query string
   */
  private async getQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.AI_SERVICE_URL}/embeddings`,
        { text: query },
        { timeout: 5000 }
      );

      if (!response.data?.embedding || !Array.isArray(response.data.embedding)) {
        throw new Error('Invalid embedding response');
      }

      return response.data.embedding;
    } catch (error) {
      logger.error('Failed to get query embedding', { error, query });
      // Return a zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  /**
   * Search only by text (full-text search)
   */
  async textSearch(query: string, limit: number = 10): Promise<any[]> {
    try {
      const results = await sequelize.query(
        `SELECT id, title, description, 
         ts_rank_cd(search_vector, plainto_tsquery('english', $1)) AS rank
         FROM scripts
         WHERE search_vector @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $2`,
        {
          bind: [query, limit],
          type: QueryTypes.SELECT
        }
      );

      return results;
    } catch (error) {
      logger.error('Text search error', { error, query });
      throw new Error('Failed to perform text search');
    }
  }

  /**
   * Search only by vector similarity
   */
  async vectorSearch(query: string, limit: number = 10): Promise<any[]> {
    try {
      const embedding = await this.getQueryEmbedding(query);
      
      // Format embedding as PostgreSQL vector
      const vectorString = `[${embedding.join(',')}]`;
      
      const results = await sequelize.query(
        `SELECT s.id, s.title, s.description,
         1 - (se.embedding <=> $1::vector) AS similarity
         FROM script_embeddings se
         JOIN scripts s ON s.id = se.script_id
         ORDER BY se.embedding <=> $1::vector
         LIMIT $2`,
        {
          bind: [vectorString, limit],
          type: QueryTypes.SELECT
        }
      );

      return results;
    } catch (error) {
      logger.error('Vector search error', { error, query });
      throw new Error('Failed to perform vector search');
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    const keys = cache.keys();
    const searchKeys = keys.filter(key => key.startsWith('hybrid_search:'));
    searchKeys.forEach(key => cache.del(key));
    logger.info('Cleared hybrid search cache', { count: searchKeys.length });
  }

  /**
   * Warm up cache with common queries
   */
  async warmCache(commonQueries: string[]): Promise<void> {
    logger.info('Warming search cache', { queryCount: commonQueries.length });
    
    for (const query of commonQueries) {
      try {
        await this.search(query, { useCache: true });
      } catch (error) {
        logger.warn('Failed to warm cache for query', { query, error });
      }
    }
  }
}

export default new HybridSearchService();