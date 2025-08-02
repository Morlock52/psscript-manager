import { QueryTypes, Sequelize } from 'sequelize';
import { Script } from '../models/Script';
import { ScriptEmbedding } from '../models/ScriptEmbedding';

interface VectorSearchResult {
  id: string;
  name: string;
  description?: string;
  content: string;
  similarity: number;
  userId: string;
  category?: string;
  created_at: Date;
}

/**
 * Secure vector similarity search using parameterized queries
 */
export class VectorSearchService {
  constructor(private sequelize: Sequelize) {}

  /**
   * Search for similar scripts using vector embeddings
   * @param embedding - The query embedding vector
   * @param options - Search options
   */
  async searchSimilarScripts(
    embedding: number[],
    options: {
      threshold?: number;
      limit?: number;
      userId?: string;
      category?: string;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const { 
      threshold = 0.7, 
      limit = 10, 
      userId, 
      category 
    } = options;

    // Validate embedding
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding vector');
    }

    // Validate threshold
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }

    // Build parameterized query with proper escaping
    let query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.content,
        s.user_id as "userId",
        s.category,
        s.created_at,
        1 - (e.embedding <=> $1::vector) as similarity
      FROM scripts s
      INNER JOIN script_embeddings e ON s.id = e.script_id
      WHERE 1 - (e.embedding <=> $1::vector) > $2
    `;

    const bindings: any[] = [
      JSON.stringify(embedding), // Will be cast to vector type
      threshold
    ];

    // Add optional filters
    if (userId) {
      query += ` AND s.user_id = $${bindings.length + 1}`;
      bindings.push(userId);
    }

    if (category) {
      query += ` AND s.category = $${bindings.length + 1}`;
      bindings.push(category);
    }

    // Add ordering and limit
    query += `
      ORDER BY similarity DESC
      LIMIT $${bindings.length + 1}
    `;
    bindings.push(limit);

    try {
      // Execute parameterized query
      const results = await this.sequelize.query<VectorSearchResult>(query, {
        bind: bindings,
        type: QueryTypes.SELECT,
        raw: true
      });

      return results;
    } catch (error) {
      console.error('Vector search error:', error);
      throw new Error('Failed to perform vector search');
    }
  }

  /**
   * Find exact duplicate scripts by content hash
   */
  async findDuplicateScripts(contentHash: string, excludeId?: string): Promise<Script[]> {
    const where: any = { contentHash };
    
    if (excludeId) {
      where.id = { [Sequelize.Op.ne]: excludeId };
    }

    return Script.findAll({
      where,
      attributes: ['id', 'name', 'userId', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Get k-nearest neighbors for a script
   */
  async getKNearestNeighbors(
    scriptId: string,
    k: number = 5
  ): Promise<VectorSearchResult[]> {
    // First get the embedding for the target script
    const targetEmbedding = await ScriptEmbedding.findOne({
      where: { scriptId },
      attributes: ['embedding']
    });

    if (!targetEmbedding || !targetEmbedding.embedding) {
      throw new Error('Script embedding not found');
    }

    // Use parameterized query for KNN search
    const query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.content,
        s.user_id as "userId",
        s.category,
        s.created_at,
        1 - (e.embedding <=> $1::vector) as similarity
      FROM scripts s
      INNER JOIN script_embeddings e ON s.id = e.script_id
      WHERE s.id != $2
      ORDER BY e.embedding <=> $1::vector
      LIMIT $3
    `;

    const results = await this.sequelize.query<VectorSearchResult>(query, {
      bind: [
        JSON.stringify(targetEmbedding.embedding),
        scriptId,
        k
      ],
      type: QueryTypes.SELECT,
      raw: true
    });

    return results;
  }

  /**
   * Perform semantic search with natural language query
   * (Requires embedding generation from query text)
   */
  async semanticSearch(
    queryEmbedding: number[],
    options: {
      limit?: number;
      minSimilarity?: number;
      filters?: {
        userId?: string;
        category?: string;
        isPublic?: boolean;
      };
    } = {}
  ): Promise<VectorSearchResult[]> {
    const { 
      limit = 20, 
      minSimilarity = 0.5,
      filters = {}
    } = options;

    // Build dynamic query with filters
    let query = `
      WITH ranked_results AS (
        SELECT 
          s.*,
          e.embedding,
          1 - (e.embedding <=> $1::vector) as similarity,
          ROW_NUMBER() OVER (ORDER BY e.embedding <=> $1::vector) as rank
        FROM scripts s
        INNER JOIN script_embeddings e ON s.id = e.script_id
        WHERE 1 - (e.embedding <=> $1::vector) > $2
    `;

    const bindings: any[] = [
      JSON.stringify(queryEmbedding),
      minSimilarity
    ];

    // Add filters
    if (filters.userId) {
      query += ` AND s.user_id = $${bindings.length + 1}`;
      bindings.push(filters.userId);
    }

    if (filters.category) {
      query += ` AND s.category = $${bindings.length + 1}`;
      bindings.push(filters.category);
    }

    if (filters.isPublic !== undefined) {
      query += ` AND s.is_public = $${bindings.length + 1}`;
      bindings.push(filters.isPublic);
    }

    query += `
      )
      SELECT 
        id,
        name,
        description,
        content,
        user_id as "userId",
        category,
        created_at,
        similarity
      FROM ranked_results
      WHERE rank <= $${bindings.length + 1}
      ORDER BY rank
    `;
    bindings.push(limit);

    try {
      const results = await this.sequelize.query<VectorSearchResult>(query, {
        bind: bindings,
        type: QueryTypes.SELECT,
        raw: true
      });

      return results;
    } catch (error) {
      console.error('Semantic search error:', error);
      throw new Error('Failed to perform semantic search');
    }
  }

  /**
   * Create vector index for better performance
   */
  async createVectorIndex(): Promise<void> {
    try {
      // Create IVFFlat index for approximate nearest neighbor search
      await this.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_script_embeddings_vector 
        ON script_embeddings 
        USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100)
      `);

      console.log('Vector index created successfully');
    } catch (error) {
      console.error('Failed to create vector index:', error);
      throw error;
    }
  }

  /**
   * Validate embedding vector
   */
  private validateEmbedding(embedding: number[]): void {
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array');
    }

    if (embedding.length !== 1536) { // OpenAI ada-002 dimension
      throw new Error('Embedding must have 1536 dimensions');
    }

    if (!embedding.every(val => typeof val === 'number' && !isNaN(val))) {
      throw new Error('Embedding must contain only valid numbers');
    }
  }
}

// Export singleton instance
export const vectorSearchService = new VectorSearchService(
  require('../db').sequelize
);