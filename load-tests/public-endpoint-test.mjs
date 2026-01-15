import https from 'https';

const SUPABASE_URL = 'https://awsolfqlwxpuhavmqtjy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c29sZnFsd3hwdWhhdm1xdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE0NDYsImV4cCI6MjA3NTA2NzQ0Nn0.vDnvUsLNDZYNndH0ebEOOdLHc6MdZQ6zGmT7wbZJL28';

const results = {
  requests: 0,
  successes: 0,
  failures: 0,
  responseTimes: [],
  endpointStats: {},
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

        if (!results.endpointStats[endpoint]) {
          results.endpointStats[endpoint] = { success: 0, fail: 0, times: [] };
        }
        results.endpointStats[endpoint].times.push(responseTime);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          results.successes++;
          results.endpointStats[endpoint].success++;
        } else {
          results.failures++;
          results.endpointStats[endpoint].fail++;
        }
        resolve({ statusCode: res.statusCode, responseTime, success: res.statusCode < 300 });
      });
    });

    req.on('error', (e) => {
      const responseTime = Date.now() - startTime;
      results.requests++;
      results.failures++;
      results.responseTimes.push(responseTime);
      resolve({ error: e.message, responseTime, success: false });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      results.requests++;
      results.failures++;
      resolve({ error: 'timeout', responseTime: 10000, success: false });
    });

    req.end();
  });
}

async function runUserSession() {
  const endpoints = [
    '/rest/v1/subscription_plans?select=id,name,price',
    '/rest/v1/demo_stores?select=id,name&limit=10',
    '/rest/v1/demo_brands?select=id,name&limit=5',
    '/rest/v1/fixed_demo_stores?select=id,name&limit=10',
    '/rest/v1/fixed_demo_reports?select=id,date&limit=20',
  ];

  for (const endpoint of endpoints) {
    await makeRequest(endpoint);
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
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
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function printResults(testName) {
  const duration = (results.endTime - results.startTime) / 1000;
  const rps = results.requests / duration;
  const errorRate = (results.failures / results.requests) * 100;

  console.log('\n' + '='.repeat(70));
  console.log(`  ${testName}`);
  console.log('='.repeat(70));
  console.log(`Duration:           ${duration.toFixed(2)}s`);
  console.log(`Total Requests:     ${results.requests}`);
  console.log(`Successes:          ${results.successes}`);
  console.log(`Failures:           ${results.failures}`);
  console.log(`Error Rate:         ${errorRate.toFixed(2)}%`);
  console.log(`Throughput:         ${rps.toFixed(2)} req/s`);
  console.log('-'.repeat(70));
  console.log('Response Times:');
  console.log(`  Min:              ${Math.min(...results.responseTimes)}ms`);
  console.log(`  Max:              ${Math.max(...results.responseTimes)}ms`);
  console.log(`  Avg:              ${(results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length).toFixed(2)}ms`);
  console.log(`  P50 (Median):     ${calculatePercentile(results.responseTimes, 50)}ms`);
  console.log(`  P95:              ${calculatePercentile(results.responseTimes, 95)}ms`);
  console.log(`  P99:              ${calculatePercentile(results.responseTimes, 99)}ms`);
  console.log('-'.repeat(70));

  console.log('Endpoint Performance:');
  for (const [endpoint, stats] of Object.entries(results.endpointStats)) {
    const shortEndpoint = endpoint.split('?')[0].replace('/rest/v1/', '');
    const avgTime = stats.times.length > 0
      ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(0)
      : 0;
    const p95 = calculatePercentile(stats.times, 95);
    console.log(`  ${shortEndpoint.padEnd(25)} | Avg: ${avgTime}ms | P95: ${p95}ms | OK: ${stats.success} | Fail: ${stats.fail}`);
  }
  console.log('-'.repeat(70));

  const p95Pass = calculatePercentile(results.responseTimes, 95) < 500;
  const p99Pass = calculatePercentile(results.responseTimes, 99) < 1000;
  const errorPass = errorRate < 1;

  console.log('Thresholds:');
  console.log(`  P95 < 500ms:      ${p95Pass ? 'PASS' : 'FAIL'} (actual: ${calculatePercentile(results.responseTimes, 95)}ms)`);
  console.log(`  P99 < 1000ms:     ${p99Pass ? 'PASS' : 'FAIL'} (actual: ${calculatePercentile(results.responseTimes, 99)}ms)`);
  console.log(`  Error Rate < 1%:  ${errorPass ? 'PASS' : 'FAIL'} (actual: ${errorRate.toFixed(2)}%)`);
  console.log('-'.repeat(70));
  console.log(`OVERALL:            ${p95Pass && p99Pass && errorPass ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(70));

  return {
    duration,
    requests: results.requests,
    rps,
    errorRate,
    p50: calculatePercentile(results.responseTimes, 50),
    p95: calculatePercentile(results.responseTimes, 95),
    p99: calculatePercentile(results.responseTimes, 99),
    pass: p95Pass && p99Pass && errorPass,
  };
}

function resetResults() {
  results.requests = 0;
  results.successes = 0;
  results.failures = 0;
  results.responseTimes = [];
  results.endpointStats = {};
  results.startTime = null;
  results.endTime = null;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          FoodValue AI - Load Test (Public Endpoints)                 ║');
  console.log('║          Supabase REST API Performance Verification                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${SUPABASE_URL}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log('\nTest Scenarios:');
  console.log('  1. Basic Load   - 30 concurrent users, 5 requests each');
  console.log('  2. Stress Test  - Ramp up to 100 concurrent users');
  console.log('  3. Spike Test   - 20 -> 80 -> 20 users');

  const allResults = [];

  console.log('\n[1/3] Basic Load Test');
  console.log('      30 concurrent users x 3 iterations = 450 requests');
  resetResults();
  results.startTime = Date.now();
  for (let i = 0; i < 3; i++) {
    console.log(`      Iteration ${i + 1}/3...`);
    await runConcurrentUsers(30);
    await new Promise(r => setTimeout(r, 500));
  }
  results.endTime = Date.now();
  allResults.push({ name: 'Basic Load', ...printResults('Basic Load Test Results') });

  console.log('\n[2/3] Stress Test');
  console.log('      Ramping: 20 -> 40 -> 60 -> 80 -> 100 users');
  resetResults();
  results.startTime = Date.now();
  for (const users of [20, 40, 60, 80, 100]) {
    console.log(`      ${users} concurrent users...`);
    await runConcurrentUsers(users);
    await new Promise(r => setTimeout(r, 300));
  }
  results.endTime = Date.now();
  allResults.push({ name: 'Stress Test', ...printResults('Stress Test Results') });

  console.log('\n[3/3] Spike Test');
  console.log('      Normal(20) -> SPIKE(80) -> Recovery(20)');
  resetResults();
  results.startTime = Date.now();
  console.log('      Phase 1: Normal load (20 users)...');
  await runConcurrentUsers(20);
  await new Promise(r => setTimeout(r, 300));
  console.log('      Phase 2: SPIKE (80 users)...');
  await runConcurrentUsers(80);
  await new Promise(r => setTimeout(r, 300));
  console.log('      Phase 3: Recovery (20 users)...');
  await runConcurrentUsers(20);
  results.endTime = Date.now();
  allResults.push({ name: 'Spike Test', ...printResults('Spike Test Results') });

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                      FINAL SUMMARY                                   ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  Test Name     │ RPS      │ P50    │ P95    │ P99    │ Err%  │ Result║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  for (const r of allResults) {
    const name = r.name.padEnd(14);
    const rps = r.rps.toFixed(1).padStart(6);
    const p50 = (r.p50 + 'ms').padStart(6);
    const p95 = (r.p95 + 'ms').padStart(6);
    const p99 = (r.p99 + 'ms').padStart(6);
    const err = (r.errorRate.toFixed(1) + '%').padStart(5);
    const pass = r.pass ? ' PASS ' : ' FAIL ';
    console.log(`║  ${name}│ ${rps}   │ ${p50} │ ${p95} │ ${p99} │ ${err} │${pass}║`);
  }
  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  const allPass = allResults.every(r => r.pass);
  const verdict = allPass ? 'PASS - Production Ready' : 'REVIEW - Check Failed Tests';
  console.log(`║  VERDICT: ${verdict.padEnd(56)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`\nCompleted: ${new Date().toISOString()}`);

  return allPass ? 0 : 1;
}

main().then(process.exit);
