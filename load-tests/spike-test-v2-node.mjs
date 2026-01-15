import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.loadtest') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://awsolfqlwxpuhavmqtjy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c29sZnFsd3hwdWhhdm1xdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTE0NDYsImV4cCI6MjA3NTA2NzQ0Nn0.vDnvUsLNDZYNndH0ebEOOdLHc6MdZQ6zGmT7wbZJL28';

const statusCodes = {
  '200': 0, '201': 0, '204': 0,
  '400': 0, '401': 0, '403': 0, '404': 0, '429': 0,
  '500': 0, '502': 0, '503': 0,
  'other': 0
};

const responseTimes = {
  publicRead: [],
  edgeFunction: []
};

const spikeStages = [
  { duration: 5000, targetVUs: 1, name: 'Baseline' },
  { duration: 1000, targetVUs: 50, name: 'Initial Spike' },
  { duration: 5000, targetVUs: 50, name: 'Hold 50' },
  { duration: 1000, targetVUs: 200, name: 'Major Spike' },
  { duration: 30000, targetVUs: 200, name: 'Sustained Peak' },
  { duration: 5000, targetVUs: 50, name: 'Recovery' },
  { duration: 5000, targetVUs: 0, name: 'Ramp Down' },
];

let currentVUs = 0;
let activeRequests = 0;
let totalRequests = 0;
let stageStartTime = Date.now();
let currentStageIndex = 0;
let testComplete = false;

async function makeRequest(type) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const startTime = Date.now();
  let url, category;

  if (type < 0.85) {
    url = `${SUPABASE_URL}/rest/v1/subscription_plans?select=id,name,display_name,price,max_stores,ai_usage_limit&order=price.asc&limit=10`;
    category = 'publicRead';
  } else {
    url = `${SUPABASE_URL}/functions/v1/health-check`;
    category = 'edgeFunction';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeout);

    const duration = Date.now() - startTime;
    responseTimes[category].push(duration);

    const status = String(response.status);
    if (status in statusCodes) {
      statusCodes[status]++;
    } else {
      statusCodes['other']++;
    }

    totalRequests++;
    return { success: status >= 200 && status < 300, duration, status };

  } catch (error) {
    const duration = Date.now() - startTime;
    responseTimes[category].push(duration);

    if (error.name === 'AbortError') {
      statusCodes['503']++;
    } else {
      statusCodes['other']++;
    }
    totalRequests++;
    return { success: false, duration, error: error.message };
  }
}

async function runVirtualUser(vuId) {
  while (!testComplete) {
    activeRequests++;
    await makeRequest(Math.random());
    activeRequests--;
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }
}

function calculatePercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateStats(arr) {
  if (arr.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / arr.length,
    p50: calculatePercentile(arr, 50),
    p95: calculatePercentile(arr, 95),
    p99: calculatePercentile(arr, 99),
  };
}

async function runSpikeTest() {
  console.log('================================================================================');
  console.log('                    SPIKE TEST v2 - Node.js Implementation');
  console.log('================================================================================');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Test Start: ${new Date().toISOString()}`);
  console.log('');
  console.log('Stage Progression:');

  const virtualUsers = new Map();
  let vuIdCounter = 0;
  const testStartTime = Date.now();

  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - testStartTime;
    const stage = spikeStages[currentStageIndex];
    console.log(`  [${(elapsed / 1000).toFixed(1)}s] VUs: ${currentVUs}, Requests: ${totalRequests}, Stage: ${stage?.name || 'Complete'}`);
  }, 5000);

  for (let i = 0; i < spikeStages.length; i++) {
    currentStageIndex = i;
    const stage = spikeStages[i];
    console.log(`\n>> Stage ${i + 1}: ${stage.name} (target: ${stage.targetVUs} VUs, duration: ${stage.duration}ms)`);

    const stageEnd = Date.now() + stage.duration;

    while (Date.now() < stageEnd && !testComplete) {
      const targetVUs = stage.targetVUs;

      while (currentVUs < targetVUs) {
        const vuId = vuIdCounter++;
        virtualUsers.set(vuId, runVirtualUser(vuId));
        currentVUs++;
      }

      while (currentVUs > targetVUs && currentVUs > 0) {
        currentVUs--;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  testComplete = true;
  clearInterval(progressInterval);

  await new Promise(resolve => setTimeout(resolve, 2000));

  const testEndTime = Date.now();
  const totalDuration = (testEndTime - testStartTime) / 1000;

  const successCount = statusCodes['200'] + statusCodes['201'] + statusCodes['204'];
  const authBlocked = statusCodes['401'] + statusCodes['403'];
  const clientErrors = statusCodes['400'] + statusCodes['404'] + statusCodes['429'];
  const serverErrors = statusCodes['500'] + statusCodes['502'] + statusCodes['503'];
  const validResponses = successCount + authBlocked;
  const successRate = totalRequests > 0 ? (validResponses / totalRequests * 100) : 0;
  const serverErrorRate = totalRequests > 0 ? (serverErrors / totalRequests * 100) : 0;

  const publicStats = calculateStats(responseTimes.publicRead);
  const edgeStats = calculateStats(responseTimes.edgeFunction);
  const allTimes = [...responseTimes.publicRead, ...responseTimes.edgeFunction];
  const overallStats = calculateStats(allTimes);

  const publicReadPassed = publicStats.p95 < 2000;
  const edgeFunctionPassed = edgeStats.p95 < 3000;
  const serverErrorsPassed = serverErrors < 10;
  const successRatePassed = successRate >= 95;
  const allPassed = publicReadPassed && edgeFunctionPassed && serverErrorsPassed && successRatePassed;

  console.log('\n================================================================================');
  console.log('                              TEST RESULTS');
  console.log('================================================================================');
  console.log(`Test Duration: ${totalDuration.toFixed(1)} seconds`);
  console.log(`Max VUs: ${Math.max(...spikeStages.map(s => s.targetVUs))}`);
  console.log(`Total Requests: ${totalRequests.toLocaleString()}`);
  console.log(`Throughput: ${(totalRequests / totalDuration).toFixed(2)} req/s`);

  console.log('\n--------------------------------------------------------------------------------');
  console.log('                           STATUS CODE BREAKDOWN');
  console.log('--------------------------------------------------------------------------------');
  console.log('  2xx Success:');
  console.log(`    200 OK:              ${statusCodes['200'].toLocaleString()}`);
  console.log(`    201 Created:         ${statusCodes['201'].toLocaleString()}`);
  console.log(`    204 No Content:      ${statusCodes['204'].toLocaleString()}`);
  console.log('');
  console.log('  4xx Auth Blocked (Expected):');
  console.log(`    401 Unauthorized:    ${statusCodes['401'].toLocaleString()}`);
  console.log(`    403 Forbidden:       ${statusCodes['403'].toLocaleString()}`);
  console.log('');
  console.log('  4xx Client Errors:');
  console.log(`    400 Bad Request:     ${statusCodes['400'].toLocaleString()}`);
  console.log(`    404 Not Found:       ${statusCodes['404'].toLocaleString()}`);
  console.log(`    429 Rate Limited:    ${statusCodes['429'].toLocaleString()}`);
  console.log('');
  console.log('  5xx Server Errors:');
  console.log(`    500 Internal Error:  ${statusCodes['500'].toLocaleString()}`);
  console.log(`    502 Bad Gateway:     ${statusCodes['502'].toLocaleString()}`);
  console.log(`    503 Unavailable:     ${statusCodes['503'].toLocaleString()}`);
  console.log('');
  console.log(`  Other:                 ${statusCodes['other'].toLocaleString()}`);
  console.log('');
  console.log(`  VALID RESPONSE RATE:   ${successRate.toFixed(2)}% (200s + expected 401s)`);
  console.log(`  SERVER ERROR RATE:     ${serverErrorRate.toFixed(4)}%`);
  console.log(`  CLIENT ERROR RATE:     ${(clientErrors / totalRequests * 100).toFixed(4)}%`);

  console.log('\n--------------------------------------------------------------------------------');
  console.log('                        RESPONSE TIME BY ENDPOINT TYPE');
  console.log('--------------------------------------------------------------------------------');
  console.log('  Public Read (subscription_plans):');
  console.log(`    Samples:             ${responseTimes.publicRead.length.toLocaleString()}`);
  console.log(`    Min:                 ${publicStats.min.toFixed(2)} ms`);
  console.log(`    Median (p50):        ${publicStats.p50.toFixed(2)} ms`);
  console.log(`    p95:                 ${publicStats.p95.toFixed(2)} ms`);
  console.log(`    p99:                 ${publicStats.p99.toFixed(2)} ms`);
  console.log(`    Max:                 ${publicStats.max.toFixed(2)} ms`);
  console.log(`    Average:             ${publicStats.avg.toFixed(2)} ms`);
  console.log(`    Threshold (p95<2s):  ${publicReadPassed ? 'PASSED' : 'FAILED'}`);
  console.log('');
  console.log('  Edge Function (health-check):');
  console.log(`    Samples:             ${responseTimes.edgeFunction.length.toLocaleString()}`);
  console.log(`    Min:                 ${edgeStats.min.toFixed(2)} ms`);
  console.log(`    Median (p50):        ${edgeStats.p50.toFixed(2)} ms`);
  console.log(`    p95:                 ${edgeStats.p95.toFixed(2)} ms`);
  console.log(`    p99:                 ${edgeStats.p99.toFixed(2)} ms`);
  console.log(`    Max:                 ${edgeStats.max.toFixed(2)} ms`);
  console.log(`    Average:             ${edgeStats.avg.toFixed(2)} ms`);
  console.log(`    Threshold (p95<3s):  ${edgeFunctionPassed ? 'PASSED' : 'FAILED'}`);
  console.log('');
  console.log('  Overall:');
  console.log(`    Median (p50):        ${overallStats.p50.toFixed(2)} ms`);
  console.log(`    p95:                 ${overallStats.p95.toFixed(2)} ms`);
  console.log(`    p99:                 ${overallStats.p99.toFixed(2)} ms`);
  console.log(`    Max:                 ${overallStats.max.toFixed(2)} ms`);

  console.log('\n--------------------------------------------------------------------------------');
  console.log('                           THRESHOLD EVALUATION');
  console.log('--------------------------------------------------------------------------------');
  console.log(`  [${publicReadPassed ? 'PASS' : 'FAIL'}] Public Read p95 < 2000ms (actual: ${publicStats.p95.toFixed(0)}ms)`);
  console.log(`  [${edgeFunctionPassed ? 'PASS' : 'FAIL'}] Edge Function p95 < 3000ms (actual: ${edgeStats.p95.toFixed(0)}ms)`);
  console.log(`  [${serverErrorsPassed ? 'PASS' : 'FAIL'}] Server Errors (5xx) < 10 (actual: ${serverErrors})`);
  console.log(`  [${successRatePassed ? 'PASS' : 'FAIL'}] Valid Response Rate >= 95% (actual: ${successRate.toFixed(2)}%)`);
  console.log(`  [INFO] Auth blocks (401/403): ${authBlocked} - expected for health-check without JWT`);

  console.log('\n================================================================================');
  console.log(`                         OVERALL RESULT: ${allPassed ? 'PASSED' : 'FAILED'}`);
  console.log('================================================================================');

  if (!allPassed) {
    console.log('\nFAILURE ANALYSIS:');
    if (!publicReadPassed) console.log('  - Public Read endpoints too slow under spike load');
    if (!edgeFunctionPassed) console.log('  - Edge Functions too slow under spike load');
    if (!serverErrorsPassed) console.log('  - Too many server errors (system instability)');
    if (!successRatePassed) console.log('  - Success rate below acceptable threshold');
  }

  console.log('\n================================================================================');
  console.log('                              TEST COMPLETE');
  console.log('================================================================================');

  return {
    passed: allPassed,
    summary: {
      duration: totalDuration,
      totalRequests,
      throughput: totalRequests / totalDuration,
      successRate,
      serverErrorRate,
      statusCodes,
      responseTimes: {
        publicRead: publicStats,
        edgeFunction: edgeStats,
        overall: overallStats,
      },
      thresholds: {
        publicReadPassed,
        edgeFunctionPassed,
        serverErrorsPassed,
        successRatePassed,
        allPassed,
      },
    },
  };
}

runSpikeTest()
  .then(result => {
    process.exit(result.passed ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
