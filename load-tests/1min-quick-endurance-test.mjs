import https from 'https';

const SUPABASE_URL = 'https://awsolfqlwxpuhavmqtjy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c29sZnFsd3hwdWhhdm1xdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE0NDYsImV4cCI6MjA3NTA2NzQ0Nn0.vDnvUsLNDZYNndH0ebEOOdLHc6MdZQ6zGmT7wbZJL28';

const TEST_DURATION_MS = 1 * 60 * 1000; // 1 minute for quick test
const CONCURRENT_USERS = 20;
const REQUEST_INTERVAL_MS = 2000;

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

async function userLoop(userId) {
  const endpoints = [
    '/rest/v1/subscription_plans?select=id,name&limit=5',
    '/rest/v1/demo_organizations?select=id,name&limit=5',
    '/rest/v1/demo_stores?select=id,name&limit=10',
    '/rest/v1/demo_reports?select=id,date&limit=20',
  ];

  const endTime = Date.now() + TEST_DURATION_MS;

  while (Date.now() < endTime) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    await makeRequest(endpoint);
    await new Promise(r => setTimeout(r, REQUEST_INTERVAL_MS));
  }
}

function calculatePercentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function printFinalResults() {
  const duration = (results.endTime - results.startTime) / 1000;
  const rps = results.requests / duration;
  const errorRate = (results.failures / results.requests) * 100;

  console.log('\n' + '='.repeat(70));
  console.log('  1-MINUTE QUICK ENDURANCE TEST - RESULTS');
  console.log('='.repeat(70));
  console.log(`Test Duration:   ${duration.toFixed(2)} seconds`);
  console.log(`Total Requests:  ${results.requests}`);
  console.log(`Successes:       ${results.successes}`);
  console.log(`Failures:        ${results.failures}`);
  console.log(`Error Rate:      ${errorRate.toFixed(2)}%`);
  console.log(`Average RPS:     ${rps.toFixed(2)} req/s`);
  console.log('-'.repeat(70));
  console.log('Response Times:');
  console.log(`  Min:           ${Math.min(...results.responseTimes)}ms`);
  console.log(`  Max:           ${Math.max(...results.responseTimes)}ms`);
  console.log(`  Average:       ${(results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length).toFixed(2)}ms`);
  console.log(`  Median (P50):  ${calculatePercentile(results.responseTimes, 50)}ms`);
  console.log(`  P95:           ${calculatePercentile(results.responseTimes, 95)}ms`);
  console.log(`  P99:           ${calculatePercentile(results.responseTimes, 99)}ms`);
  console.log('-'.repeat(70));

  const p95 = calculatePercentile(results.responseTimes, 95);
  const p99 = calculatePercentile(results.responseTimes, 99);
  const p95Pass = p95 < 1000;
  const p99Pass = p99 < 2000;
  const errorPass = errorRate < 1;

  console.log('Performance Thresholds:');
  console.log(`  P95 < 1000ms:  ${p95Pass ? 'PASS ✓' : 'FAIL ✗'} (${p95}ms)`);
  console.log(`  P99 < 2000ms:  ${p99Pass ? 'PASS ✓' : 'FAIL ✗'} (${p99}ms)`);
  console.log(`  Error < 1%:    ${errorPass ? 'PASS ✓' : 'FAIL ✗'} (${errorRate.toFixed(2)}%)`);
  console.log('-'.repeat(70));

  const overallPass = p95Pass && p99Pass && errorPass;
  console.log(`OVERALL RESULT:  ${overallPass ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log('='.repeat(70));

  if (results.errors.length > 0) {
    console.log(`\nErrors: ${results.errors.length} total`);
    results.errors.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.endpoint}: ${e.error || `HTTP ${e.statusCode}`}`);
    });
  }

  return overallPass;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     FoodValue AI - 1-MINUTE QUICK ENDURANCE TEST                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget:           ${SUPABASE_URL}`);
  console.log(`Duration:         1 minute`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Start Time:       ${new Date().toISOString()}\n`);
  console.log('Starting test...\n');

  results.startTime = Date.now();

  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - results.startTime) / 1000);
    process.stdout.write(`\rElapsed: ${elapsed}s | Requests: ${results.requests} | Errors: ${results.failures}`);
  }, 1000);

  const userPromises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(userLoop(i));
  }

  await Promise.all(userPromises);
  clearInterval(progressInterval);

  results.endTime = Date.now();

  console.log('\n\nTest completed. Generating results...\n');

  const passed = printFinalResults();

  console.log(`\nEnd Time: ${new Date().toISOString()}`);
  console.log('═'.repeat(70));

  if (passed) {
    console.log('\n✓ Quick test passed! Ready for full 10-minute test.');
  } else {
    console.log('\n✗ Issues detected. Review before running longer test.');
  }

  return passed ? 0 : 1;
}

main().then(process.exit);
