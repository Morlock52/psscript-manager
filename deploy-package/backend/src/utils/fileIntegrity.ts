/**
 * Utility functions for file integrity verification
 */
import crypto from 'crypto';
import { Sequelize } from 'sequelize';
import logger from './logger';

/**
 * Calculate MD5 hash of a file buffer
 * @param buffer - File buffer to hash
 * @returns MD5 hash as a hexadecimal string
 */
export const calculateBufferMD5 = (buffer: Buffer): string => {
  return crypto.createHash('md5').update(buffer).digest('hex');
};

/**
 * Calculate MD5 hash of a string
 * @param content - String content to hash
 * @returns MD5 hash as a hexadecimal string
 */
export const calculateStringMD5 = (content: string): string => {
  return crypto.createHash('md5').update(content).digest('hex');
};

/**
 * Check if a file with the same hash already exists in the database
 * @param fileHash - MD5 hash to check
 * @param sequelize - Sequelize instance
 * @returns Promise that resolves to the script ID if found, or null if not found
 */
export const checkFileExists = async (fileHash: string, sequelize: Sequelize): Promise<number | null> => {
  try {
    const [result] = await sequelize.query(
      `SELECT id FROM scripts WHERE file_hash = :fileHash LIMIT 1`,
      {
        replacements: { fileHash },
        type: 'SELECT',
        raw: true
      }
    );
    
    if (result && (result as any).id) {
      logger.info(`Found existing script with hash ${fileHash}: ID ${(result as any).id}`);
      return (result as any).id;
    }
    
    return null;
  } catch (error) {
    logger.error('Error checking file existence:', error);
    return null;
  }
};

/**
 * Verify file integrity by comparing hash
 * @param content - File content
 * @param expectedHash - Expected MD5 hash
 * @returns Boolean indicating whether the file is valid
 */
export const verifyFileIntegrity = (content: string, expectedHash: string): boolean => {
  const actualHash = calculateStringMD5(content);
  return actualHash === expectedHash;
};

/**
 * Update file hash in the database
 * @param scriptId - Script ID
 * @param fileHash - MD5 hash to update
 * @param sequelize - Sequelize instance
 * @returns Promise that resolves to true if successful, false otherwise
 */
export const updateFileHash = async (
  scriptId: number, 
  fileHash: string, 
  sequelize: Sequelize
): Promise<boolean> => {
  try {
    await sequelize.query(
      `UPDATE scripts SET file_hash = :fileHash WHERE id = :scriptId`,
      {
        replacements: { fileHash, scriptId },
        type: 'UPDATE'
      }
    );
    
    logger.info(`Updated file hash for script ${scriptId}: ${fileHash}`);
    return true;
  } catch (error) {
    logger.error(`Error updating file hash for script ${scriptId}:`, error);
    return false;
  }
};

/**
 * Batch update file hashes for scripts without hashes
 * @param sequelize - Sequelize instance
 * @returns Promise that resolves to the number of scripts updated
 */
export const batchUpdateFileHashes = async (sequelize: Sequelize): Promise<number> => {
  try {
    const [result] = await sequelize.query(
      `UPDATE scripts SET file_hash = md5(content::text) WHERE file_hash IS NULL RETURNING id`,
      {
        type: 'UPDATE'
      }
    );
    
    const count = Array.isArray(result) ? result.length : 0;
    logger.info(`Batch updated file hashes for ${count} scripts`);
    return count;
  } catch (error) {
    logger.error('Error batch updating file hashes:', error);
    return 0;
  }
};
