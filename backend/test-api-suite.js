const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const BASE_URL = "http://localhost:4000/api";
const JWT_SECRET = process.env.JWT_SECRET;

async function runTests() {
  console.log("==========================================");
  console.log("🚀 COMPREHENSIVE BACKEND INTEGRATION TEST SUITE");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.response?.data || err.message);
      failed++;
    }
  }

  // Generate tokens
  const userToken = jwt.sign(
    { id: 3, role: "user", name: "Baby" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const adminToken = jwt.sign(
    { id: 2, role: "admin", name: "Abdurazak" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 1. Public & Server Info
  await test("GET /server-time", async () => {
    const res = await axios.get(`${BASE_URL}/server-time`);
    if (!res.data.serverTime) throw new Error("Missing serverTime");
  });

  await test("GET /availability", async () => {
    const res = await axios.get(`${BASE_URL}/availability`);
    if (res.status !== 200) throw new Error("Status not 200");
  });

  await test("GET /orders/pricing", async () => {
    const res = await axios.get(`${BASE_URL}/orders/pricing`);
    if (!res.data.ertibNormalPrice) throw new Error("Missing pricing fields");
  });

  await test("GET /notifications/status", async () => {
    const res = await axios.get(`${BASE_URL}/notifications/status`);
    if (typeof res.data.enabled !== "boolean") throw new Error("Missing enabled");
  });

  // 2. Authentication & Profile
  await test("GET /auth/me", async () => {
    const res = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (!res.data.id || !res.data.phone) throw new Error("Invalid profile");
  });

  await test("PUT /auth/profile (Update Name & Block with autocomplete format)", async () => {
    const res = await axios.put(
      `${BASE_URL}/auth/profile`,
      { name: "Baby Student", block: "Block 14, Room 204" },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    if (res.data.user?.block !== "Block 14, Room 204") {
      throw new Error("Block was not updated properly");
    }
  });

  await test("GET /auth/stats (User Delivery Stats)", async () => {
    const res = await axios.get(`${BASE_URL}/auth/stats`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (typeof res.data.totalOrders !== "number") throw new Error("Invalid stats");
    if (!res.data.favoriteFood) throw new Error("Missing favoriteFood");
  });

  await test("GET /orders/my-history (User Order History)", async () => {
    const res = await axios.get(`${BASE_URL}/orders/my-history`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (!Array.isArray(res.data)) throw new Error("History must be an array");
  });

  await test("GET /orders/latest (User Latest Orders)", async () => {
    const res = await axios.get(`${BASE_URL}/orders/latest`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (!Array.isArray(res.data)) throw new Error("Latest must be an array");
  });

  // 3. FCM Device Token Registration
  await test("POST /notifications/register-token", async () => {
    const res = await axios.post(
      `${BASE_URL}/notifications/register-token`,
      {
        token: "test-device-token-12345",
        phone: "+251945677895",
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    if (!res.data.success) throw new Error("Token registration failed");
  });

  // 4. Admin Management Endpoints
  await test("GET /admin/stats", async () => {
    const res = await axios.get(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (typeof res.data.ordersToday !== "number") throw new Error("Invalid ordersToday");
  });

  await test("GET /admin/pricing", async () => {
    const res = await axios.get(`${BASE_URL}/admin/pricing`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.data.ertibNormalPrice) throw new Error("Missing admin pricing");
  });

  await test("GET /orders (Admin Order List with Pagination)", async () => {
    const res = await axios.get(`${BASE_URL}/orders?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!Array.isArray(res.data.data)) throw new Error("Orders must have data array");
    if (typeof res.data.total !== "number") throw new Error("Missing total count");
  });

  // 5. Order Tracking by Code
  await test("GET /orders/track/:code (Existing Order Lookup)", async () => {
    // Find an existing order from the admin list
    const ordersRes = await axios.get(`${BASE_URL}/orders?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (ordersRes.data.data && ordersRes.data.data.length > 0) {
      const sampleOrder = ordersRes.data.data[0];
      const trackRes = await axios.get(`${BASE_URL}/orders/track/${sampleOrder.trackingCode}`);
      if (trackRes.data.trackingCode !== sampleOrder.trackingCode) {
        throw new Error("Track code mismatch");
      }
    }
  });

  // 6. Security & Unauthorized Checks
  await test("GET /admin/stats (Reject non-admin user)", async () => {
    try {
      await axios.get(`${BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      throw new Error("Should have been forbidden");
    } catch (err) {
      if (err.response?.status !== 403) throw err;
    }
  });

  await test("GET /auth/me (Reject unauthenticated request)", async () => {
    try {
      await axios.get(`${BASE_URL}/auth/me`);
      throw new Error("Should have been unauthorized");
    } catch (err) {
      if (err.response?.status !== 401) throw err;
    }
  });

  console.log("==========================================");
  console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
