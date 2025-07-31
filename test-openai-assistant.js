#!/usr/bin/env node

/**
 * Test script for the OpenAI Assistant integration
 * This script tests the OpenAI Assistant API by creating a thread and sending a message
 */

require('dotenv').config();
const axios = require('axios');

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set.');
  console.error('Please set your OpenAI API key in the .env file or export it:');
  console.error('export OPENAI_API_KEY=your_api_key_here');
  process.exit(1);
}

// Check if OpenAI Assistant ID is set
if (!process.env.OPENAI_ASSISTANT_ID) {
  console.error('Error: OPENAI_ASSISTANT_ID environment variable is not set.');
  console.error('Please set your OpenAI Assistant ID in the .env file or export it:');
  console.error('export OPENAI_ASSISTANT_ID=your_assistant_id_here');
  process.exit(1);
}

// Create axios instance with OpenAI API configuration
const openai = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v1'
  }
});

// Test message to send to the assistant
const TEST_MESSAGE = 'Write a simple PowerShell script that lists all running processes and sorts them by memory usage.';

/**
 * Create a thread
 * @returns {Promise<string>} Thread ID
 */
async function createThread() {
  try {
    console.log('Creating thread...');
    const response = await openai.post('/threads', {});
    return response.data.id;
  } catch (error) {
    console.error('Error creating thread:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Add a message to a thread
 * @param {string} threadId Thread ID
 * @param {string} content Message content
 * @returns {Promise<string>} Message ID
 */
async function addMessage(threadId, content) {
  try {
    console.log(`Adding message to thread ${threadId}...`);
    const response = await openai.post(`/threads/${threadId}/messages`, {
      role: 'user',
      content
    });
    return response.data.id;
  } catch (error) {
    console.error('Error adding message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Run the assistant on a thread
 * @param {string} threadId Thread ID
 * @returns {Promise<string>} Run ID
 */
async function runAssistant(threadId) {
  try {
    console.log(`Running assistant on thread ${threadId}...`);
    const response = await openai.post(`/threads/${threadId}/runs`, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID
    });
    return response.data.id;
  } catch (error) {
    console.error('Error running assistant:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check the status of a run
 * @param {string} threadId Thread ID
 * @param {string} runId Run ID
 * @returns {Promise<string>} Run status
 */
async function checkRunStatus(threadId, runId) {
  try {
    const response = await openai.get(`/threads/${threadId}/runs/${runId}`);
    return response.data.status;
  } catch (error) {
    console.error('Error checking run status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Wait for a run to complete
 * @param {string} threadId Thread ID
 * @param {string} runId Run ID
 * @returns {Promise<string>} Final run status
 */
async function waitForRunCompletion(threadId, runId) {
  console.log('Waiting for assistant to respond...');
  
  let status = await checkRunStatus(threadId, runId);
  
  // Poll for status every 1 second
  while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
    // Add a small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check status again
    status = await checkRunStatus(threadId, runId);
    process.stdout.write('.');
  }
  
  console.log(`\nRun completed with status: ${status}`);
  return status;
}

/**
 * Get messages from a thread
 * @param {string} threadId Thread ID
 * @returns {Promise<Array>} Messages
 */
async function getMessages(threadId) {
  try {
    console.log(`Getting messages from thread ${threadId}...`);
    const response = await openai.get(`/threads/${threadId}/messages`);
    return response.data.data;
  } catch (error) {
    console.error('Error getting messages:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main function to test the OpenAI Assistant
 */
async function testAssistant() {
  try {
    console.log('=== Testing OpenAI Assistant Integration ===');
    console.log(`Assistant ID: ${process.env.OPENAI_ASSISTANT_ID}`);
    console.log(`Test message: "${TEST_MESSAGE}"`);
    console.log('');
    
    // Create a thread
    const threadId = await createThread();
    console.log(`Thread created with ID: ${threadId}`);
    
    // Add a message to the thread
    await addMessage(threadId, TEST_MESSAGE);
    
    // Run the assistant on the thread
    const runId = await runAssistant(threadId);
    console.log(`Run started with ID: ${runId}`);
    
    // Wait for the run to complete
    const finalStatus = await waitForRunCompletion(threadId, runId);
    
    if (finalStatus === 'completed') {
      // Get messages from the thread
      const messages = await getMessages(threadId);
      
      // Find the assistant's response (most recent assistant message)
      const assistantMessages = messages.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length > 0) {
        const latestResponse = assistantMessages[0];
        console.log('\n=== Assistant Response ===\n');
        
        // Extract and print the content
        latestResponse.content.forEach(content => {
          if (content.type === 'text') {
            console.log(content.text.value);
          }
        });
        
        console.log('\n=== Test Completed Successfully ===');
      } else {
        console.error('No assistant response found in the thread.');
      }
    } else {
      console.error(`Run failed with status: ${finalStatus}`);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAssistant();
