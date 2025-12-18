const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.AI_SERVICE_MODE = 'mock';
const { app } = require('../src/ai-service/agent-assistant');

let server;
let baseUrl;

const jsonHeaders = { 'content-type': 'application/json' };

async function startServer() {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopServer() {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

test.before(async () => {
  await startServer();
});

test.after(async () => {
  await stopServer();
});

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return { status: response.status, data };
}

test('ask endpoint returns mock response', async () => {
  const { status, data } = await postJson('/api/ask', {
    question: 'How do I list running services in PowerShell?'
  });

  assert.equal(status, 200);
  assert.ok(data.response);
  assert.match(data.response, /Mock response/i);
  assert.equal(data.metadata.mode, 'mock');
});

test('analyze endpoint returns structured analysis', async () => {
  const { status, data } = await postJson('/api/analyze', {
    content: 'Get-Service | Where-Object {$_.Status -eq "Running"}',
    filename: 'services.ps1',
    requestType: 'detailed'
  });

  assert.equal(status, 200);
  assert.ok(data.analysis);
  assert.equal(data.analysis.purpose, 'Mock analysis response');
  assert.equal(data.metadata.requestType, 'detailed');
});

test('generate endpoint responds with script and explanation', async () => {
  const { status, data } = await postJson('/api/generate', {
    description: 'collect disk usage information'
  });

  assert.equal(status, 200);
  assert.ok(data.script.includes('Mock PowerShell script'));
  assert.ok(data.explanation.length > 0);
});

test('explain endpoint handles missing context gracefully', async () => {
  const { status, data } = await postJson('/api/explain', {
    content: 'Write-Output "Hello"',
    type: 'simple'
  });

  assert.equal(status, 200);
  assert.match(data.explanation, /Mock explanation/);
});

test('examples endpoint enforces limits', async () => {
  const { status, data } = await postJson('/api/examples', {
    description: 'system',
    limit: 2
  });

  assert.equal(status, 200);
  assert.ok(Array.isArray(data.scripts));
  assert.ok(data.scripts.length <= 2);
  assert.ok(data.scripts.length >= 1);
});

test('health endpoint reports service metadata', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.mode, 'mock');
  assert.equal(data.status, 'ok');
});
