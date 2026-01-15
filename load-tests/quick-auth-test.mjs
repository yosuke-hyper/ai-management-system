import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.loadtest');
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    return vars;
  } catch (e) {
    return {};
  }
}

const env = loadEnvFile();

const SUPABASE_URL = env.SUPABASE_URL || 'https://awsolfqlwxpuhavmqtjy.supabase.co';
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c29sZnFsd3hwdWhhdm1xdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE0NDYsImV4cCI6MjA3NTA2NzQ0Nn0.vDnvUsLNDZYNndH0ebEOOdLHc6MdZQ6zGmT7wbZJL28';
const TEST_USER_EMAIL = env.TEST_USER_EMAIL || 'loadtest2@foodvalue-ai.test';
const TEST_USER_PASSWORD = env.TEST_USER_PASSWORD || 'LoadTest2025Secure';
const TEST_ORG_ID = env.TEST_ORG_ID || 'f849a583-dde9-46c5-bc48-5f16c3f038b9';

let accessToken = null;
let TEST_STORE_ID = null;
let TEST_USER_ID = null;

const results = {
  reads: { requests: 0, successes: 0, failures: 0, times: [] },
  writes: { requests: 0, successes: 0, failures: 0, times: [] },
  aggregations: { requests: 0, successes: 0, failures: 0, times: [] },
  all: { requests: 0, successes: 0, failures: 0, times: [] },
};

function makeRequest(endpoint, method = 'GET', body = null, category = 'reads', extraHeaders = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(endpoint, SUPABASE_URL);

    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        results[category].requests++;
        results[category].times.push(responseTime);
        results.all.requests++;
        results.all.times.push(responseTime);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          results[category].successes++;
          results.all.successes++;
        } else {
          results[category].failures++;
          results.all.failures++;
        }
        resolve({ statusCode: res.statusCode, responseTime, success: res.statusCode < 300, data });
      });
    });

    req.on('error', (e) => {
      const responseTime = Date.now() - startTime;
      results[category].requests++;
      results[category].failures++;
      results[category].times.push(responseTime);
      results.all.requests++;
      results.all.failures++;
      results.all.times.push(responseTime);
      resolve({ error: e.message, responseTime, success: false });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ error: 'timeout', responseTime: 15000, success: false });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function authenticate() {
  console.log(`Authenticating: ${TEST_USER_EMAIL}...`);

  const res = await makeRequest(
    '/auth/v1/token?grant_type=password',
    'POST',
    { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD },
    'reads'
  );

  if (res.success && res.data) {
    try {
      const parsed = JSON.parse(res.data);
      if (parsed.access_token) {
        accessToken = parsed.access_token;
        TEST_USER_ID = parsed.user?.id;
        console.log('Authentication successful!');
        console.log(`User ID: ${TEST_USER_ID}`);
        return true;
      }
    } catch (e) {
      console.log(`Parse error: ${e.message}`);
    }
  }

  console.log(`Authentication failed: ${res.statusCode}`);
  if (res.data) {
    try {
      console.log(`Response: ${res.data}`);
    } catch (e) {}
  }
  return false;
}

async function fetchTestStoreId() {
  const res = await makeRequest(
    `/rest/v1/stores?select=id,name&organization_id=eq.${TEST_ORG_ID}&limit=1`,
    'GET',
    null,
    'reads'
  );

  if (res.success && res.data) {
    try {
      const parsed = JSON.parse(res.data);
      if (parsed && parsed.length > 0) {
        TEST_STORE_ID = parsed[0].id;
        console.log(`Found store: ${parsed[0].name} (${TEST_STORE_ID})`);
        return TEST_STORE_ID;
      }
    } catch (e) {}
  }
  return null;
}

async function testReadWithRLS() {
  console.log('\n--- Testing READ with RLS ---');

  const endpoints = [
    { name: 'daily_reports', path: `/rest/v1/daily_reports?select=*&organization_id=eq.${TEST_ORG_ID}&limit=10` },
    { name: 'stores', path: `/rest/v1/stores?select=*&organization_id=eq.${TEST_ORG_ID}` },
    { name: 'targets', path: `/rest/v1/targets?select=*&organization_id=eq.${TEST_ORG_ID}&limit=5` },
    { name: 'monthly_expenses', path: `/rest/v1/monthly_expenses?select=*&organization_id=eq.${TEST_ORG_ID}&limit=5` },
  ];

  for (const ep of endpoints) {
    const res = await makeRequest(ep.path, 'GET', null, 'reads');
    const status = res.success ? 'OK' : 'FAIL';
    let count = 0;
    if (res.data) {
      try {
        const parsed = JSON.parse(res.data);
        count = Array.isArray(parsed) ? parsed.length : 0;
      } catch (e) {}
    }
    console.log(`  ${ep.name.padEnd(20)}: ${status} (${res.statusCode}) - ${count} rows - ${res.responseTime}ms`);
  }
}

async function testAggregationQueries() {
  console.log('\n--- Testing Aggregation Queries ---');

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const endpoints = [
    { name: 'monthly_data', path: `/rest/v1/daily_reports?select=date,sales,purchase,labor_cost,customers&organization_id=eq.${TEST_ORG_ID}&date=gte.${startOfMonth}&date=lte.${endOfMonth}` },
    { name: 'kpi_data', path: `/rest/v1/daily_reports?select=store_id,date,sales,purchase,customers&organization_id=eq.${TEST_ORG_ID}&limit=100` },
    { name: 'targets', path: `/rest/v1/targets?select=*&organization_id=eq.${TEST_ORG_ID}` },
  ];

  for (const ep of endpoints) {
    const res = await makeRequest(ep.path, 'GET', null, 'aggregations');
    const status = res.success ? 'OK' : 'FAIL';
    let count = 0;
    if (res.data) {
      try {
        const parsed = JSON.parse(res.data);
        count = Array.isArray(parsed) ? parsed.length : 0;
      } catch (e) {}
    }
    console.log(`  ${ep.name.padEnd(20)}: ${status} (${res.statusCode}) - ${count} rows - ${res.responseTime}ms`);
  }
}

async function testWriteWithRLS() {
  console.log('\n--- Testing WRITE (UPSERT) with RLS ---');

  if (!TEST_STORE_ID) {
    console.log('  No store found - skipping write test');
    return;
  }

  const testDate = '2025-01-15';
  const reportData = {
    store_id: TEST_STORE_ID,
    organization_id: TEST_ORG_ID,
    user_id: TEST_USER_ID,
    date: testDate,
    operation_type: 'lunch',
    sales: 85000,
    purchase: 25500,
    labor_cost: 17000,
    utilities: 5000,
    customers: 45,
  };

  const res = await makeRequest(
    '/rest/v1/daily_reports',
    'POST',
    reportData,
    'writes',
    { 'Prefer': 'resolution=merge-duplicates' }
  );

  const status = res.success ? 'OK' : 'FAIL';
  console.log(`  daily_reports UPSERT: ${status} (${res.statusCode}) - ${res.responseTime}ms`);
  if (!res.success && res.data) {
    console.log(`  Error: ${res.data}`);
  }
}

async function runLoadTest(durationSeconds = 60) {
  console.log(`\n--- Running ${durationSeconds}s Load Test ---`);

  const startTime = Date.now();
  const endTime = startTime + (durationSeconds * 1000);
  let batchCount = 0;

  while (Date.now() < endTime) {
    batchCount++;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(`\r  Batch ${batchCount} | Elapsed: ${elapsed}s | Requests: ${results.all.requests} | Errors: ${results.all.failures}    `);

    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(makeRequest(`/rest/v1/daily_reports?select=*&organization_id=eq.${TEST_ORG_ID}&limit=20`, 'GET', null, 'reads'));
      promises.push(makeRequest(`/rest/v1/stores?select=*&organization_id=eq.${TEST_ORG_ID}`, 'GET', null, 'reads'));
    }
    await Promise.all(promises);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n');
}

function calculatePercentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function printResults() {
  const errorRate = results.all.requests > 0 ? (results.all.failures / results.all.requests) * 100 : 0;
  const p95 = calculatePercentile(results.all.times, 95);
  const p99 = calculatePercentile(results.all.times, 99);
  const avgTime = results.all.times.length > 0
    ? (results.all.times.reduce((a, b) => a + b, 0) / results.all.times.length).toFixed(0)
    : 0;

  console.log('=' .repeat(80));
  console.log('  QUICK AUTH TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`  Total Requests:   ${results.all.requests}`);
  console.log(`  Successes:        ${results.all.successes}`);
  console.log(`  Failures:         ${results.all.failures} (${errorRate.toFixed(2)}%)`);
  console.log(`  Avg Response:     ${avgTime}ms`);
  console.log(`  P95:              ${p95}ms`);
  console.log(`  P99:              ${p99}ms`);
  console.log('-'.repeat(80));
  console.log(`  Reads:            ${results.reads.successes}/${results.reads.requests}`);
  console.log(`  Aggregations:     ${results.aggregations.successes}/${results.aggregations.requests}`);
  console.log(`  Writes:           ${results.writes.successes}/${results.writes.requests}`);
  console.log('='.repeat(80));

  const pass = errorRate < 1 && p95 < 500;
  console.log(`  VERDICT: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           FoodValue AI - Quick Authentication Test                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${SUPABASE_URL}`);
  console.log(`Org ID: ${TEST_ORG_ID}`);
  console.log(`Time:   ${new Date().toISOString()}`);

  const authOk = await authenticate();
  if (!authOk) {
    console.log('\nFATAL: Authentication failed. Exiting.');
    process.exit(1);
  }

  await fetchTestStoreId();
  await testReadWithRLS();
  await testAggregationQueries();
  await testWriteWithRLS();
  await runLoadTest(60);

  const pass = printResults();
  process.exit(pass ? 0 : 1);
}

main();
