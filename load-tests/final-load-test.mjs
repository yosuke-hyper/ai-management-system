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
    '/rest/v1/fixed_demo_stores?select=id,name&limit=10',
    '/rest/v1/fixed_demo_reports?select=id,date&limit=20',
    '/rest/v1/demo_sessions?select=id,created_at&limit=5',
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
  const errorRate = results.requests > 0 ? (results.failures / results.requests) * 100 : 0;

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
  const minTime = results.responseTimes.length > 0 ? Math.min(...results.responseTimes) : 0;
  const maxTime = results.responseTimes.length > 0 ? Math.max(...results.responseTimes) : 0;
  const avgTime = results.responseTimes.length > 0
    ? (results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length).toFixed(2)
    : 0;
  console.log(`  Min:              ${minTime}ms`);
  console.log(`  Max:              ${maxTime}ms`);
  console.log(`  Avg:              ${avgTime}ms`);
  console.log(`  P50 (Median):     ${calculatePercentile(results.responseTimes, 50)}ms`);
  console.log(`  P95:              ${calculatePercentile(results.responseTimes, 95)}ms`);
  console.log(`  P99:              ${calculatePercentile(results.responseTimes, 99)}ms`);
  console.log('-'.repeat(70));

  console.log('Endpoint Performance:');
  for (const [endpoint, stats] of Object.entries(results.endpointStats)) {
    const shortEndpoint = endpoint.split('?')[0].replace('/rest/v1/', '');
    const avgT = stats.times.length > 0
      ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(0)
      : 0;
    const p95 = calculatePercentile(stats.times, 95);
    console.log(`  ${shortEndpoint.padEnd(25)} | Avg: ${String(avgT).padStart(4)}ms | P95: ${String(p95).padStart(4)}ms | OK: ${String(stats.success).padStart(4)} | Fail: ${stats.fail}`);
  }
  console.log('-'.repeat(70));

  const p95Val = calculatePercentile(results.responseTimes, 95);
  const p99Val = calculatePercentile(results.responseTimes, 99);
  const p95Pass = p95Val < 500;
  const p99Pass = p99Val < 1000;
  const errorPass = errorRate < 1;

  console.log('Thresholds:');
  console.log(`  P95 < 500ms:      ${p95Pass ? 'PASS' : 'FAIL'} (actual: ${p95Val}ms)`);
  console.log(`  P99 < 1000ms:     ${p99Pass ? 'PASS' : 'FAIL'} (actual: ${p99Val}ms)`);
  console.log(`  Error Rate < 1%:  ${errorPass ? 'PASS' : 'FAIL'} (actual: ${errorRate.toFixed(2)}%)`);
  console.log('-'.repeat(70));
  const overall = p95Pass && p99Pass && errorPass;
  console.log(`OVERALL:            ${overall ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(70));

  return {
    duration,
    requests: results.requests,
    rps,
    errorRate,
    p50: calculatePercentile(results.responseTimes, 50),
    p95: p95Val,
    p99: p99Val,
    pass: overall,
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
  console.log('║       FoodValue AI - Production Load Test Suite                      ║');
  console.log('║       Supabase REST API Performance Verification                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${SUPABASE_URL}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log('\nEndpoints Under Test:');
  console.log('  - subscription_plans (public)');
  console.log('  - demo_stores (public)');
  console.log('  - fixed_demo_stores (public)');
  console.log('  - fixed_demo_reports (public)');
  console.log('  - demo_sessions (public)');

  const allResults = [];

  console.log('\n[1/3] BASIC LOAD TEST');
  console.log('      Simulating 30 concurrent users, 3 iterations');
  resetResults();
  results.startTime = Date.now();
  for (let i = 0; i < 3; i++) {
    process.stdout.write(`      Iteration ${i + 1}/3...`);
    await runConcurrentUsers(30);
    console.log(' done');
    await new Promise(r => setTimeout(r, 500));
  }
  results.endTime = Date.now();
  allResults.push({ name: 'Basic Load', ...printResults('BASIC LOAD TEST RESULTS') });

  console.log('\n[2/3] STRESS TEST');
  console.log('      Ramping: 20 -> 40 -> 60 -> 80 -> 100 concurrent users');
  resetResults();
  results.startTime = Date.now();
  for (const users of [20, 40, 60, 80, 100]) {
    process.stdout.write(`      ${users} users...`);
    await runConcurrentUsers(users);
    console.log(' done');
    await new Promise(r => setTimeout(r, 300));
  }
  results.endTime = Date.now();
  allResults.push({ name: 'Stress', ...printResults('STRESS TEST RESULTS') });

  console.log('\n[3/3] SPIKE TEST');
  console.log('      Pattern: Normal(20) -> SPIKE(100) -> Recovery(20)');
  resetResults();
  results.startTime = Date.now();
  process.stdout.write('      Phase 1: Normal (20 users)...');
  await runConcurrentUsers(20);
  console.log(' done');
  await new Promise(r => setTimeout(r, 300));
  process.stdout.write('      Phase 2: SPIKE (100 users)...');
  await runConcurrentUsers(100);
  console.log(' done');
  await new Promise(r => setTimeout(r, 300));
  process.stdout.write('      Phase 3: Recovery (20 users)...');
  await runConcurrentUsers(20);
  console.log(' done');
  results.endTime = Date.now();
  allResults.push({ name: 'Spike', ...printResults('SPIKE TEST RESULTS') });

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         FINAL SUMMARY                                ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  Test        │ Requests │  RPS   │  P50   │  P95   │  P99   │ Result ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  for (const r of allResults) {
    const name = r.name.padEnd(12);
    const reqs = String(r.requests).padStart(8);
    const rps = r.rps.toFixed(1).padStart(6);
    const p50 = (r.p50 + 'ms').padStart(6);
    const p95 = (r.p95 + 'ms').padStart(6);
    const p99 = (r.p99 + 'ms').padStart(6);
    const pass = r.pass ? ' PASS  ' : ' FAIL  ';
    console.log(`║  ${name}│ ${reqs} │ ${rps} │ ${p50} │ ${p95} │ ${p99} │${pass}║`);
  }
  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  const allPass = allResults.every(r => r.pass);
  const totalReqs = allResults.reduce((sum, r) => sum + r.requests, 0);
  const avgRps = allResults.reduce((sum, r) => sum + r.rps, 0) / allResults.length;

  console.log(`║  Total Requests: ${totalReqs}    Average RPS: ${avgRps.toFixed(1)}                        ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  if (allPass) {
    console.log('║                                                                      ║');
    console.log('║    VERDICT:  PASS - System Ready for Production                     ║');
    console.log('║                                                                      ║');
  } else {
    console.log('║                                                                      ║');
    console.log('║    VERDICT:  REVIEW REQUIRED - Check Failed Tests                   ║');
    console.log('║                                                                      ║');
  }
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`\nCompleted: ${new Date().toISOString()}`);

  return allPass ? 0 : 1;
}

main().then(code => {
  process.exitCode = code;
});
