import http from 'k6/http';
import { check, sleep } from 'k6';

// Load testing options: ramp up VUs to trigger Kubernetes HPA CPU scaling (>60%)
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm up
    { duration: '1m', target: 35 },  # High load target (triggers HPA scaling)
    { duration: '30s', target: 50 }, // Spike load
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],   // Less than 5% error rate
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8000';

const LOCATIONS = [
  'Sector G-10, Islamabad',
  'Commercial Market, Rawalpindi',
  'Gulberg III, Lahore',
  'Clifton Block 2, Karachi',
  'Sector F-7/3, Islamabad',
];

const COMPLAINT_TITLES = [
  'Pothole causing vehicle traffic slowdown',
  'Water pipeline leaking profusely on main road',
  'Electric wire dangling dangerously low near bus stop',
  'Garbage dump heap overflowing near market stalls',
  'Sewer gutters overflowing onto pedestrian sidewalk',
];

export default function () {
  // 1. GET /api/stats (Tests Redis 30s TTL cache & X-Cache header)
  const statsRes = http.get(`${BASE_URL}/api/stats`);
  check(statsRes, {
    'stats status is 200': (r) => r.status === 200,
    'stats has X-Cache header': (r) => r.headers['X-Cache'] !== undefined,
  });
  sleep(0.5);

  // 2. GET /api/complaints (Tests pagination & filtering)
  const listRes = http.get(`${BASE_URL}/api/complaints?skip=0&limit=10`);
  check(listRes, {
    'list status is 200': (r) => r.status === 200,
  });
  sleep(0.5);

  // 3. POST /api/complaints (Tests AI auto-triage pipeline & cache invalidation)
  const randomTitle = COMPLAINT_TITLES[Math.floor(Math.random() * COMPLAINT_TITLES.length)];
  const randomLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

  const payload = JSON.stringify({
    title: `${randomTitle} ${Date.now()}`,
    description: `Automated k6 load test submission for complaint performance benchmarking.`,
    location: randomLocation,
  });

  const headers = { 'Content-Type': 'application/json' };
  const postRes = http.post(`${BASE_URL}/api/complaints`, payload, { headers });

  check(postRes, {
    'create status is 201': (r) => r.status === 201,
    'complaint triaged': (r) => JSON.parse(r.body).status === 'TRIAGED',
  });

  sleep(1);
}
