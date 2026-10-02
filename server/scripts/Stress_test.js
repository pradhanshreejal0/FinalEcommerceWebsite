import http from 'k6/http';
import { sleep, check } from 'k6';

// 1. Configure the Stress Scenario
export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up: Scale from 0 to 50 users in 1 minute
    { duration: '3m', target: 50 },  // Stress: Hold 50 users steady for 3 minutes
    { duration: '1m', target: 200 }, // Spike: Push hard up to 200 users over 1 minute
    { duration: '2m', target: 200 }, // Peak Stress: Hold 200 users for 2 minutes
    { duration: '1m', target: 0 },   // Ramp down: Cool down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Test fails if more than 1% of requests error out
    http_req_duration: ['p(95)<2000'], // 95% of requests must respond in under 2000ms (2s)
  },
};

// 2. Define the Simulated User Behavior
export default function () {
  const BASE_URL = 'https://finalecommercewebsite-backend.onrender.com/api'; // Change to your local backend API port

  // We use a random number to split user traffic into different actions
  const roll = Math.random();

  if (roll < 0.50) {
    // 50% of users are regular customers browsing products
    let res = http.get(`${BASE_URL}/api/products`);
    check(res, { 'browse products status was 200': (r) => r.status === 200 });

  } else if (roll >= 0.50 && roll < 0.80) {
    // 30% of users simulate customers adding items to their cart
    let payload = JSON.stringify({ productId: '123', quantity: 1 });
    let params = { headers: { 'Content-Type': 'application/json' } };

    let res = http.post(`${BASE_URL}/api/cart`, payload, params);
    check(res, { 'add to cart status was 200 or 201': (r) => r.status === 200 || r.status === 201 });

  } else {
    // Remaining 20% simulate multi-vendor dashboards loading analytics
    // (Note: If your endpoints require a token, you can pass it in headers)
    let params = { headers: { 'Authorization': 'Bearer MOCK_VENDOR_TOKEN' } };

    let res = http.get(`${BASE_URL}/api/vendor/dashboard`, params);
    check(res, { 'vendor dashboard status was 200': (r) => r.status === 200 });
  }

  // Think time: Wait 1 to 3 seconds before this virtual user repeats an action
  sleep(Math.random() * 2 + 1);
}
