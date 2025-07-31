/**
 * JavaScript version of fileIntegrity utility for testing
 */
const crypto = require('crypto');

/**
 * Calculate MD5 hash of a string
 * @param {string} content - String content to hash
 * @returns {string} MD5 hash as a hexadecimal string
 */
const calculateStringMD5 = (content) => {
  return crypto.createHash('md5').update(content).digest('hex');
};

/**
 * Calculate MD5 hash of a file buffer
 * @param {Buffer} buffer - File buffer to hash
 * @returns {string} MD5 hash as a hexadecimal string
 */
const calculateBufferMD5 = (buffer) => {
  return crypto.createHash('md5').update(buffer).digest('hex');
};

/**
 * Verify file integrity by comparing hash
 * @param {string} content - File content
 * @param {string} expectedHash - Expected MD5 hash
 * @returns {boolean} Boolean indicating whether the file is valid
 */
const verifyFileIntegrity = (content, expectedHash) => {
  const actualHash = calculateStringMD5(content);
  return actualHash === expectedHash;
};

module.exports = {
  calculateStringMD5,
  calculateBufferMD5,
  verifyFileIntegrity
};
