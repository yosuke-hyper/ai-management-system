import https from 'https';

const SUPABASE_URL = 'https://awsolfqlwxpuhavmqtjy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c29sZnFsd3hwdWhhdm1xdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE0NDYsImV4cCI6MjA3NTA2NzQ0Nn0.vDnvUsLNDZYNndH0ebEOOdLHc6MdZQ6zGmT7wbZJL28';

const results = {
  requests: 0,
  successes: 0,
  failures: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null,
};

function makeRequest(endpoint, method = 'GET') {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(endpoint, SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        results.requests++;
        results.responseTimes.push(responseTime);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          results.successes++;
        } else {
          results.failures++;
          results.errors.push({ endpoint, statusCode: res.statusCode, responseTime });
        }
        resolve({ statusCode: res.statusCode, responseTime, success: res.statusCode < 300 });
      });
    });

    req.on('error', (e) => {
      const responseTime = Date.now() - startTime;
      results.requests++;
      results.failures++;
      results.responseTimes.push(responseTime);
      results.errors.push({ endpoint, error: e.message, responseTime });
      resolve({ error: e.message, responseTime, success: false });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      results.requests++;
      results.failures++;
      results.responseTimes.push(responseTime);
      results.errors.push({ endpoint, error: 'timeout', responseTime });
      resolve({ error: 'timeout', responseTime, success: false });
    });

    req.end();
  });
}

async function runUserSession() {
  const endpoints = [
    '/rest/v1/stores?select=id,name&limit=10',
    '/rest/v1/daily_reports?select=id,date,store_id&limit=20',
    '/rest/v1/organizations?select=id,name&limit=5',
    '/rest/v1/targets?select=id,year,month&limit=12',
    '/rest/v1/subscription_plans?select=id,name,price&limit=5',
  ];

  for (const endpoint of endpoints) {
    await makeRequest(endpoint);
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
  }
}

async function runConcurrentUsers(userCount) {
  const promises = [];
  for (let i = 0; i < userCount; i++) {
    promises.push(runUserSession());
  }
  await Promise.all(promises);
}

function calculatePercentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function printResults(testName) {
  const duration = (results.endTime - results.startTime) / 1000;
  const rps = results.requests / duration;
  const errorRate = (results.failures / results.requests) * 100;

  console.log('\n' + '='.repeat(60));
  console.log(`  ${testName} Results`);
  console.log('='.repeat(60));
  console.log(`Duration:        ${duration.toFixed(2)}s`);
  console.log(`Total Requests:  ${results.requests}`);
  console.log(`Successes:       ${results.successes}`);
  console.log(`Failures:        ${results.failures}`);
  console.log(`Error Rate:      ${errorRate.toFixed(2)}%`);
  console.log(`RPS:             ${rps.toFixed(2)} req/s`);
  console.log('-'.repeat(60));
  console.log('Response Times:');
  console.log(`  Min:           ${Math.min(...results.responseTimes)}ms`);
  console.log(`  Max:           ${Math.max(...results.responseTimes)}ms`);
  console.log(`  Avg:           ${(results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length).toFixed(2)}ms`);
  console.log(`  P50:           ${calculatePercentile(results.responseTimes, 50)}ms`);
  console.log(`  P95:           ${calculatePercentile(results.responseTimes, 95)}ms`);
  console.log(`  P99:           ${calculatePercentile(results.responseTimes, 99)}ms`);
  console.log('-'.repeat(60));

  const p95Pass = calculatePercentile(results.responseTimes, 95) < 500;
  const p99Pass = calculatePercentile(results.responseTimes, 99) < 1000;
  const errorPass = errorRate < 1;

  console.log('Thresholds:');
  console.log(`  P95 < 500ms:   ${p95Pass ? 'PASS' : 'FAIL'}`);
  console.log(`  P99 < 1000ms:  ${p99Pass ? 'PASS' : 'FAIL'}`);
  console.log(`  Error < 1%:    ${errorPass ? 'PASS' : 'FAIL'}`);
  console.log('-'.repeat(60));
  console.log(`OVERALL:         ${p95Pass && p99Pass && errorPass ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0 && results.errors.length <= 10) {
    console.log('\nErrors (first 10):');
    results.errors.slice(0, 10).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.endpoint}: ${e.error || `HTTP ${e.statusCode}`}`);
    });
  }

  return { p95Pass, p99Pass, errorPass, overall: p95Pass && p99Pass && errorPass };
}

function resetResults() {
  results.requests = 0;
  results.successes = 0;
  results.failures = 0;
  results.responseTimes = [];
  results.errors = [];
  results.startTime = null;
  results.endTime = null;
}

async function basicLoadTest() {
  console.log('\n[1/3] Basic Load Test - 20 concurrent users, 3 iterations');
  resetResults();
  results.startTime = Date.now();

  for (let i = 0; i < 3; i++) {
    console.log(`  Iteration ${i + 1}/3...`);
    await runConcurrentUsers(20);
    await new Promise(r => setTimeout(r, 1000));
  }

  results.endTime = Date.now();
  return printResults('Basic Load Test');
}

async function stressTest() {
  console.log('\n[2/3] Stress Test - Ramping up to 50 concurrent users');
  resetResults();
  results.startTime = Date.now();

  const stages = [10, 20, 30, 40, 50];
  for (const users of stages) {
    console.log(`  Running with ${users} users...`);
    await runConcurrentUsers(users);
    await new Promise(r => setTimeout(r, 500));
  }

  results.endTime = Date.now();
  return printResults('Stress Test');
}

async function spikeTest() {
  console.log('\n[3/3] Spike Test - Normal(10) -> Spike(50) -> Normal(10)');
  resetResults();
  results.startTime = Date.now();

  console.log('  Phase 1: Normal load (10 users)...');
  await runConcurrentUsers(10);
  await new Promise(r => setTimeout(r, 500));

  console.log('  Phase 2: SPIKE (50 users)...');
  await runConcurrentUsers(50);
  await new Promise(r => setTimeout(r, 500));

  console.log('  Phase 3: Recovery (10 users)...');
  await runConcurrentUsers(10);

  results.endTime = Date.now();
  return printResults('Spike Test');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          FoodValue AI - Load Test Suite                    ║');
  console.log('║          Target: Supabase REST API                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget URL: ${SUPABASE_URL}`);
  console.log(`Start Time: ${new Date().toISOString()}`);

  const testResults = {
    basic: null,
    stress: null,
    spike: null,
  };

  try {
    testResults.basic = await basicLoadTest();
    testResults.stress = await stressTest();
    testResults.spike = await spikeTest();
  } catch (error) {
    console.error('Test error:', error);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  FINAL SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Basic Load Test:   ${testResults.basic?.overall ? 'PASS' : 'FAIL'}`);
  console.log(`Stress Test:       ${testResults.stress?.overall ? 'PASS' : 'FAIL'}`);
  console.log(`Spike Test:        ${testResults.spike?.overall ? 'PASS' : 'FAIL'}`);
  console.log('-'.repeat(60));
  const allPass = testResults.basic?.overall && testResults.stress?.overall && testResults.spike?.overall;
  console.log(`OVERALL VERDICT:   ${allPass ? 'PASS - Ready for Production' : 'FAIL - Review Required'}`);
  console.log('═'.repeat(60));
  console.log(`\nEnd Time: ${new Date().toISOString()}`);

  return allPass ? 0 : 1;
}

main().then(process.exit);
