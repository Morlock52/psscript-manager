/**
 * Utility functions for vector operations
 */
import { sequelize } from '../database/connection';
import { Transaction } from 'sequelize';
import logger from './logger';
import axios from 'axios';

// Determine AI service URL based on environment
const isDocker = process.env.DOCKER_ENV === 'true';
const AI_SERVICE_URL = isDocker 
  ? (process.env.AI_SERVICE_URL || 'http://ai-service:8000')
  : (process.env.AI_SERVICE_URL || 'http://localhost:8000');

/**
 * Generate embedding for text using the AI service
 * @param text - Text to generate embedding for
 * @returns Promise that resolves to the embedding vector
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    // Prepare request configuration
    const config = {
      headers: {},
      timeout: 15000 // 15 second timeout
    };
    
    if (openaiApiKey) {
      config.headers['x-api-key'] = openaiApiKey;
    }
    
    // Request embedding from AI service
    const response = await axios.post(`${AI_SERVICE_URL}/embed`, {
      text: text.substring(0, 8000), // Limit text length
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
    }, config);
    
    return response.data.embedding;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    throw error;
  }
};

/**
 * Delete embedding for a specific script
 * @param scriptId - ID of the script whose embedding should be deleted
 * @param transaction - Optional Sequelize transaction
 * @returns Promise that resolves when the embedding is deleted
 */
export const deleteEmbedding = async (scriptId: number, transaction?: Transaction): Promise<void> => {
  try {
    logger.info(`Deleting embedding for script ID: ${scriptId}`);
    await sequelize.query(`
      DELETE FROM script_embeddings WHERE script_id = :scriptId;
    `, {
      replacements: { scriptId },
      type: 'DELETE',
      transaction // Pass transaction if provided
    });
    logger.info(`Successfully deleted embedding for script ID: ${scriptId}`);
  } catch (error) {
    logger.error(`Error deleting embedding for script ID ${scriptId}:`, error);
    // Re-throw the error so the calling function (and transaction) knows it failed
    throw error;
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Cosine similarity (between -1 and 1)
 */
export const cosineSimilarity = (vec1: number[], vec2: number[]): number => {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  return dotProduct / (mag1 * mag2);
};

/**
 * Search for scripts by vector similarity
 * @param embedding - Query embedding vector
 * @param limit - Maximum number of results to return
 * @param threshold - Similarity threshold (0-1)
 * @param filters - Additional filters for the query
 * @returns Promise that resolves to an array of search results
 */
export const searchByVector = async (
  embedding: number[],
  limit: number = 10,
  threshold: number = 0.7,
  filters: any = {}
): Promise<any[]> => {
  try {
    // Convert embedding to PostgreSQL vector format
    const vectorString = `[${embedding.join(',')}]`;
    
    // Build WHERE clause for additional filters
    let whereClause = `1 - (s.embedding <=> '${vectorString}') > ${threshold}`;
    const replacements: any = {};
    
    if (filters.categoryId) {
      whereClause += ' AND s.category_id = :categoryId';
      replacements.categoryId = filters.categoryId;
    }
    
    if (filters.isPublic !== undefined) {
      whereClause += ' AND s.is_public = :isPublic';
      replacements.isPublic = filters.isPublic;
    }
    
    if (filters.userId) {
      whereClause += ' AND s.user_id = :userId';
      replacements.userId = filters.userId;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      whereClause += ` AND s.id IN (
        SELECT st.script_id 
        FROM script_tags st 
        JOIN tags t ON st.tag_id = t.id 
        WHERE t.name IN (:tags)
      )`;
      replacements.tags = filters.tags;
    }
    
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordConditions = filters.keywords.map((_: any, index: number) => 
        `(s.title ILIKE :keyword${index} OR s.description ILIKE :keyword${index} OR s.content ILIKE :keyword${index})`
      ).join(' OR ');
      
      whereClause += ` AND (${keywordConditions})`;
      
      filters.keywords.forEach((keyword: string, index: number) => {
        replacements[`keyword${index}`] = `%${keyword}%`;
      });
    }
    
    // Execute the query with vector search
    const [results] = await sequelize.query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.content,
        s.user_id as "userId",
        s.category_id as "categoryId",
        s.version,
        s.execution_count as "executionCount",
        s.is_public as "isPublic",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt",
        s.file_path as "filePath",
        s.file_hash as "fileHash",
        1 - (s.embedding <=> '${vectorString}') as similarity
      FROM 
        scripts s
      WHERE 
        ${whereClause}
      ORDER BY 
        similarity DESC
      LIMIT ${limit};
    `, {
      replacements,
      type: 'SELECT',
      raw: true
    });
    
    return results;
  } catch (error) {
    logger.error('Error searching by vector:', error);
    throw error;
  }
};

/**
 * Hybrid search combining vector similarity and keyword search
 * @param query - Search query
 * @param limit - Maximum number of results to return
 * @param threshold - Similarity threshold (0-1)
 * @param filters - Additional filters for the query
 * @returns Promise that resolves to an array of search results
 */
export const hybridSearch = async (
  query: string,
  limit: number = 10,
  threshold: number = 0.7,
  filters: any = {}
): Promise<any[]> => {
  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    
    // Extract keywords from the query
    const keywords = query.split(/\s+/).filter(word => word.length > 3);
    
    // Add keywords to filters
    const searchFilters = {
      ...filters,
      keywords: keywords
    };
    
    // Perform vector search with keyword filtering
    return await searchByVector(embedding, limit, threshold, searchFilters);
  } catch (error) {
    logger.error('Error performing hybrid search:', error);
    throw error;
  }
};

/**
 * Find similar scripts to a given script
 * @param scriptId - Script ID
 * @param limit - Maximum number of results to return
 * @param threshold - Similarity threshold (0-1)
 * @returns Promise that resolves to an array of similar scripts
 */
export const findSimilarScripts = async (
  scriptId: number,
  limit: number = 5,
  threshold: number = 0.7
): Promise<any[]> => {
  try {
    // Get the script's embedding from the script_embeddings table
    const result = await sequelize.query(`
      SELECT embedding FROM script_embeddings WHERE script_id = :scriptId;
    `, {
      replacements: { scriptId },
      type: 'SELECT',
      raw: true
    });
    
    // Get the first result
    const scriptResult = result[0] as any;
    
    if (!scriptResult || !scriptResult.embedding) {
      throw new Error(`Script with ID ${scriptId} not found or has no embedding`);
    }
    
    // Convert embedding to array if it's not already
    const embedding = Array.isArray(scriptResult.embedding) 
      ? scriptResult.embedding 
      : JSON.parse(scriptResult.embedding);
    
    // Search for similar scripts, joining scripts and script_embeddings
    const [results] = await sequelize.query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.user_id as "userId",
        s.category_id as "categoryId",
        s.version,
        s.execution_count as "executionCount",
        s.is_public as "isPublic",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt",
        1 - (se.embedding <=> :embedding) as similarity
      FROM 
        scripts s
      JOIN 
        script_embeddings se ON s.id = se.script_id
      WHERE 
        s.id != :scriptId AND
        se.embedding IS NOT NULL AND -- Ensure embedding exists
        1 - (se.embedding <=> :embedding) > :threshold
      ORDER BY 
        similarity DESC
      LIMIT :limit;
    `, {
      replacements: { 
        scriptId,
        embedding: JSON.stringify(embedding),
        threshold,
        limit
      },
      type: 'SELECT',
      raw: true
    });
    
    return results;
  } catch (error) {
    logger.error('Error finding similar scripts:', error);
    throw error;
  }
};
