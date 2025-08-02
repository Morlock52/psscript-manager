import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const API_BASE_URL = __ENV.API_URL || 'http://localhost:4001/api';

// Custom metrics
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const scriptListDuration = new Trend('script_list_duration');
const scriptCreateDuration = new Trend('script_create_duration');
const aiRequestDuration = new Trend('ai_request_duration');

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - minimal load
    smoke: {
      executor: 'constant-vus',
      vus: 2,
      duration: '1m',
      startTime: '0s',
      tags: { scenario: 'smoke' }
    },
    
    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '5m', target: 50 },  // Stay at 50 users
        { duration: '2m', target: 0 },   // Ramp down to 0 users
      ],
      startTime: '2m',
      tags: { scenario: 'load' }
    },
    
    // Stress test - beyond normal load
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Ramp up to 200 users
        { duration: '5m', target: 200 },  // Stay at 200 users
        { duration: '2m', target: 0 },    // Ramp down to 0 users
      ],
      startTime: '12m',
      tags: { scenario: 'stress' }
    },
    
    // Spike test - sudden traffic increase
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },    // Baseline load
        { duration: '1m', target: 5 },     // Stay at baseline
        { duration: '10s', target: 500 },  // Spike to 500 users
        { duration: '3m', target: 500 },   // Stay at spike
        { duration: '10s', target: 5 },    // Back to baseline
        { duration: '1m', target: 5 },     // Stay at baseline
        { duration: '10s', target: 0 },    // Ramp down
      ],
      startTime: '28m',
      tags: { scenario: 'spike' }
    },
    
    // Soak test - extended duration
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
      startTime: '37m',
      tags: { scenario: 'soak' }
    }
  },
  
  thresholds: {
    // General thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'], // Error rate under 10%
    errors: ['rate<0.1'], // Custom error rate under 10%
    
    // Specific endpoint thresholds
    'http_req_duration{endpoint:auth}': ['p(95)<300'],
    'http_req_duration{endpoint:scripts_list}': ['p(95)<400'],
    'http_req_duration{endpoint:script_create}': ['p(95)<1000'],
    'http_req_duration{endpoint:ai_request}': ['p(95)<5000'],
  },
};

// Helper functions
function authenticateUser() {
  const email = `user_${randomString(8)}@example.com`;
  const password = 'Test123!@#';
  
  // Register user
  const registerPayload = JSON.stringify({
    email: email,
    password: password,
    username: `user_${randomString(8)}`
  });
  
  const registerRes = http.post(`${API_BASE_URL}/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth' }
  });
  
  // Login
  const loginPayload = JSON.stringify({
    email: email,
    password: password
  });
  
  const loginRes = http.post(`${API_BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth' }
  });
  
  authDuration.add(loginRes.timings.duration);
  
  const success = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });
  
  errorRate.add(!success);
  
  return loginRes.json('token') || null;
}

// Test scenarios
export function smokeTest() {
  const token = authenticateUser();
  if (!token) return;
  
  // Basic health check
  const healthRes = http.get(`${API_BASE_URL}/health`);
  check(healthRes, {
    'health check ok': (r) => r.status === 200,
  });
  
  sleep(1);
}

export function normalUserBehavior() {
  const token = authenticateUser();
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Browse scripts
  const listRes = http.get(`${API_BASE_URL}/scripts?limit=10&page=1`, {
    headers: headers,
    tags: { endpoint: 'scripts_list' }
  });
  
  scriptListDuration.add(listRes.timings.duration);
  
  const listSuccess = check(listRes, {
    'scripts listed': (r) => r.status === 200,
    'has data': (r) => r.json('data') !== undefined,
  });
  
  errorRate.add(!listSuccess);
  sleep(randomIntBetween(1, 3));
  
  // View categories
  const categoriesRes = http.get(`${API_BASE_URL}/categories`, {
    headers: headers,
    tags: { endpoint: 'categories' }
  });
  
  check(categoriesRes, {
    'categories loaded': (r) => r.status === 200,
  });
  
  sleep(randomIntBetween(1, 2));
  
  // Create a script (30% probability)
  if (Math.random() < 0.3) {
    const scriptPayload = JSON.stringify({
      name: `Test Script ${randomString(10)}`,
      description: 'Performance test script',
      content: `Write-Host "Performance test ${Date.now()}"`,
      categoryId: randomIntBetween(1, 5),
      tags: ['test', 'performance']
    });
    
    const createRes = http.post(`${API_BASE_URL}/scripts`, scriptPayload, {
      headers: headers,
      tags: { endpoint: 'script_create' }
    });
    
    scriptCreateDuration.add(createRes.timings.duration);
    
    const createSuccess = check(createRes, {
      'script created': (r) => r.status === 201,
      'has id': (r) => r.json('id') !== undefined,
    });
    
    errorRate.add(!createSuccess);
    
    if (createSuccess) {
      const scriptId = createRes.json('id');
      
      // View created script
      sleep(1);
      const viewRes = http.get(`${API_BASE_URL}/scripts/${scriptId}`, {
        headers: headers,
        tags: { endpoint: 'script_view' }
      });
      
      check(viewRes, {
        'script retrieved': (r) => r.status === 200,
      });
    }
  }
  
  // Use AI features (20% probability)
  if (Math.random() < 0.2) {
    const aiPayload = JSON.stringify({
      question: 'How do I list all running processes?',
      context: { category: 'system' }
    });
    
    const aiRes = http.post(`${API_BASE_URL}/ai-agent/please`, aiPayload, {
      headers: headers,
      tags: { endpoint: 'ai_request' },
      timeout: '30s'
    });
    
    aiRequestDuration.add(aiRes.timings.duration);
    
    const aiSuccess = check(aiRes, {
      'AI response received': (r) => r.status === 200,
      'has answer': (r) => r.json('answer') !== undefined,
    });
    
    errorRate.add(!aiSuccess);
  }
  
  // Search scripts (40% probability)
  if (Math.random() < 0.4) {
    const searchQueries = ['process', 'file', 'network', 'system', 'user'];
    const query = searchQueries[randomIntBetween(0, searchQueries.length - 1)];
    
    const searchRes = http.get(`${API_BASE_URL}/search/text?q=${query}&limit=10`, {
      headers: headers,
      tags: { endpoint: 'search' }
    });
    
    check(searchRes, {
      'search completed': (r) => r.status === 200,
    });
  }
  
  sleep(randomIntBetween(2, 5));
}

export function powerUserBehavior() {
  const token = authenticateUser();
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Rapid API calls
  for (let i = 0; i < 5; i++) {
    const endpoints = [
      '/scripts?limit=20',
      '/categories',
      '/tags',
      '/analytics/popular',
      '/search/text?q=test'
    ];
    
    const endpoint = endpoints[randomIntBetween(0, endpoints.length - 1)];
    const res = http.get(`${API_BASE_URL}${endpoint}`, {
      headers: headers,
      tags: { endpoint: 'rapid_access' }
    });
    
    const success = check(res, {
      'rapid request successful': (r) => r.status === 200,
    });
    
    errorRate.add(!success);
    sleep(0.5); // Very short delay between requests
  }
  
  // Bulk operations
  const batch = [];
  for (let i = 0; i < 3; i++) {
    batch.push({
      method: 'POST',
      url: `${API_BASE_URL}/scripts`,
      body: JSON.stringify({
        name: `Bulk Script ${randomString(10)}`,
        description: 'Bulk creation test',
        content: 'Write-Host "Bulk test"',
        categoryId: 1
      }),
      params: { headers: headers }
    });
  }
  
  const batchRes = http.batch(batch);
  batchRes.forEach(res => {
    const success = check(res, {
      'bulk create successful': (r) => r.status === 201,
    });
    errorRate.add(!success);
  });
}

export function maliciousUserBehavior() {
  // Attempt various attacks
  const attacks = [
    // SQL Injection attempts
    {
      method: 'GET',
      url: `${API_BASE_URL}/scripts?limit=10&page=1' OR '1'='1`,
      tags: { attack: 'sql_injection' }
    },
    // XSS attempts
    {
      method: 'POST',
      url: `${API_BASE_URL}/scripts`,
      body: JSON.stringify({
        name: '<script>alert("XSS")</script>',
        description: 'Test',
        content: 'Write-Host "Test"',
        categoryId: 1
      }),
      headers: { 'Content-Type': 'application/json' },
      tags: { attack: 'xss' }
    },
    // Path traversal
    {
      method: 'GET',
      url: `${API_BASE_URL}/scripts/../../../etc/passwd`,
      tags: { attack: 'path_traversal' }
    },
    // Large payload
    {
      method: 'POST',
      url: `${API_BASE_URL}/scripts`,
      body: JSON.stringify({
        name: 'Large Script',
        description: 'A'.repeat(1000000), // 1MB description
        content: 'Write-Host "Test"',
        categoryId: 1
      }),
      headers: { 'Content-Type': 'application/json' },
      tags: { attack: 'large_payload' }
    }
  ];
  
  attacks.forEach(attack => {
    const res = http.request(attack.method, attack.url, attack.body, {
      headers: attack.headers || {},
      tags: attack.tags
    });
    
    // We expect these to be blocked
    const blocked = check(res, {
      'attack blocked': (r) => r.status >= 400,
    });
    
    if (!blocked) {
      errorRate.add(1);
      console.error(`Security issue: ${attack.tags.attack} not blocked!`);
    }
  });
}

// Main scenario selector
export default function() {
  const scenario = __ENV.SCENARIO || 'normal';
  
  switch(scenario) {
    case 'smoke':
      smokeTest();
      break;
    case 'power':
      powerUserBehavior();
      break;
    case 'malicious':
      maliciousUserBehavior();
      break;
    default:
      normalUserBehavior();
  }
}

// Setup and teardown
export function setup() {
  // Check if API is accessible
  const res = http.get(`${API_BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`API health check failed: ${res.status}`);
  }
  
  console.log('API is accessible, starting tests...');
  return { startTime: new Date() };
}

export function teardown(data) {
  console.log(`Tests completed. Duration: ${new Date() - data.startTime}ms`);
  
  // Generate summary
  console.log('\n=== Test Summary ===');
  console.log(`Error rate: ${errorRate.rate * 100}%`);
}