#!/usr/bin/env node

/**
 * API Testing Script
 * Quick script to test all API endpoints
 *
 * Usage: node test-api.js
 */

const API_BASE_URL = "http://localhost:5000/v1";
let authToken = "";
let shopId = "";
let userId = "";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, body = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

async function test1_SignupOwner() {
  log("\n=== Test 1: Shop Owner Signup ===", "cyan");

  const result = await makeRequest("POST", "/auth/signup-owner", {
    owner_name: "Test Owner",
    email: `test${Date.now()}@example.com`,
    phone: "9876543210",
    password: "TestPass@123",
    shop_name: "Test Shop",
    business_type: "Testing",
  });

  if (result.status === 201 && result.data.success) {
    authToken = result.data.data.token;
    shopId = result.data.data.shop_id;
    log("✓ Shop owner signup successful", "green");
    log(`  Token: ${authToken.substring(0, 20)}...`, "yellow");
    log(`  Shop ID: ${shopId}`, "yellow");
    return true;
  } else {
    log("✗ Shop owner signup failed", "red");
    console.log(result);
    return false;
  }
}

async function test2_Login() {
  log("\n=== Test 2: Login ===", "cyan");

  const result = await makeRequest("POST", "/auth/login", {
    email_or_phone: "test@example.com",
    password: "WrongPassword",
  });

  if (result.status === 401) {
    log("✓ Login correctly rejected invalid credentials", "green");
    return true;
  } else {
    log("✗ Login validation failed", "red");
    return false;
  }
}

async function test3_GetShopProfile() {
  log("\n=== Test 3: Get Shop Profile ===", "cyan");

  const result = await makeRequest("GET", "/shop/profile", null, authToken);

  if (result.status === 200 && result.data.success) {
    log("✓ Shop profile retrieved successfully", "green");
    log(`  Shop Name: ${result.data.data.shop_name}`, "yellow");
    return true;
  } else {
    log("✗ Failed to get shop profile", "red");
    console.log(result);
    return false;
  }
}

async function test4_UpdateShopProfile() {
  log("\n=== Test 4: Update Shop Profile ===", "cyan");

  const result = await makeRequest(
    "PUT",
    "/shop/profile",
    {
      address: "123 Test Street, Test City",
      gst_number: "29ABCDE1234F1Z5",
    },
    authToken,
  );

  if (result.status === 200 && result.data.success) {
    log("✓ Shop profile updated successfully", "green");
    return true;
  } else {
    log("✗ Failed to update shop profile", "red");
    console.log(result);
    return false;
  }
}

async function test5_AddStaffUser() {
  log("\n=== Test 5: Add Staff User ===", "cyan");

  const result = await makeRequest(
    "POST",
    "/users",
    {
      name: "Test Staff",
      email: `staff${Date.now()}@example.com`,
      phone: "8888888888",
      role: "STAFF",
    },
    authToken,
  );

  if (result.status === 201 && result.data.success) {
    userId = result.data.data.user_id;
    log("✓ Staff user added successfully", "green");
    log(`  User ID: ${userId}`, "yellow");
    log(`  Temp Password: ${result.data.data.temporary_password}`, "yellow");
    return true;
  } else {
    log("✗ Failed to add staff user", "red");
    console.log(result);
    return false;
  }
}

async function test6_ListUsers() {
  log("\n=== Test 6: List All Users ===", "cyan");

  const result = await makeRequest("GET", "/users", null, authToken);

  if (result.status === 200 && result.data.success) {
    log(`✓ Retrieved ${result.data.data.length} users`, "green");
    result.data.data.forEach((user) => {
      log(`  - ${user.name} (${user.role})`, "yellow");
    });
    return true;
  } else {
    log("✗ Failed to list users", "red");
    console.log(result);
    return false;
  }
}

async function test7_GetUserById() {
  log("\n=== Test 7: Get User By ID ===", "cyan");

  if (!userId) {
    log("⚠ Skipped - no user ID available", "yellow");
    return true;
  }

  const result = await makeRequest("GET", `/users/${userId}`, null, authToken);

  if (result.status === 200 && result.data.success) {
    log("✓ User retrieved successfully", "green");
    log(`  Name: ${result.data.data.name}`, "yellow");
    log(`  Role: ${result.data.data.role}`, "yellow");
    return true;
  } else {
    log("✗ Failed to get user", "red");
    console.log(result);
    return false;
  }
}

async function test8_UnauthorizedAccess() {
  log("\n=== Test 8: Unauthorized Access Test ===", "cyan");

  const result = await makeRequest("GET", "/shop/profile");

  if (result.status === 401) {
    log("✓ Correctly blocked unauthorized access", "green");
    return true;
  } else {
    log("✗ Security check failed - unauthorized access allowed", "red");
    return false;
  }
}

async function runAllTests() {
  log("\n╔══════════════════════════════════════════════════╗", "blue");
  log("║  Warranty & Sales Management API - Test Suite   ║", "blue");
  log("╚══════════════════════════════════════════════════╝", "blue");

  log(`\nBase URL: ${API_BASE_URL}`, "cyan");
  log("Starting tests...\n");

  const tests = [
    test1_SignupOwner,
    test2_Login,
    test3_GetShopProfile,
    test4_UpdateShopProfile,
    test5_AddStaffUser,
    test6_ListUsers,
    test7_GetUserById,
    test8_UnauthorizedAccess,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`✗ Test error: ${error.message}`, "red");
      failed++;
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  log("\n╔══════════════════════════════════════════════════╗", "blue");
  log("║                  Test Results                    ║", "blue");
  log("╚══════════════════════════════════════════════════╝", "blue");
  log(`\nTotal Tests: ${tests.length}`);
  log(`Passed: ${passed}`, passed > 0 ? "green" : "reset");
  log(`Failed: ${failed}`, failed > 0 ? "red" : "reset");
  log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    log("🎉 All tests passed!", "green");
  } else {
    log("⚠ Some tests failed. Check the output above.", "yellow");
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL.replace("/v1", "")}/`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    log("\n✗ Error: Server is not running!", "red");
    log("Please start the server first: npm start", "yellow");
    process.exit(1);
  }

  await runAllTests();
})();
