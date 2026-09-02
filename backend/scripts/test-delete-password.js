import AuthService from "../service/authService.js";
import Shop from "../models/Shop.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import bcrypt from "bcryptjs";

async function runTests() {
  console.log("=== Running Delete Password Verification Tests ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  const authService = new AuthService();

  // Test 1: Verify fallback to Owner Login Password when no custom delete password set
  try {
    const mockUser = {
      _id: "user123",
      comparePassword: async (pwd) => pwd === "ownerSecret123",
    };

    // Mock User.findById
    User.findById = async () => mockUser;

    // Mock Shop.findById
    Shop.findById = () => ({
      select: async () => ({
        _id: "shop123",
        delete_security_password: null,
      }),
    });

    const fallbackResult = await authService.verifyDeletePassword({
      userId: "user123",
      shopId: "shop123",
      deletePassword: "ownerSecret123",
    });

    assert(fallbackResult.isValid === true, "Owner login password fallback should be valid");
    assert(fallbackResult.isCustom === false, "Fallback should indicate isCustom = false");

    const fallbackInvalid = await authService.verifyDeletePassword({
      userId: "user123",
      shopId: "shop123",
      deletePassword: "wrongPassword",
    });

    assert(fallbackInvalid.isValid === false, "Wrong fallback password should be invalid");

    // Test 2: Custom Delete Password Hash & Verification
    const hashedCustom = await bcrypt.hash("customDelete123", 10);
    Shop.findById = () => ({
      select: async () => ({
        _id: "shop123",
        delete_security_password: hashedCustom,
      }),
    });

    const customValid = await authService.verifyDeletePassword({
      userId: "user123",
      shopId: "shop123",
      deletePassword: "customDelete123",
    });

    assert(customValid.isValid === true, "Custom delete security password should be valid");
    assert(customValid.isCustom === true, "Custom password check should return isCustom = true");

    const customInvalid = await authService.verifyDeletePassword({
      userId: "user123",
      shopId: "shop123",
      deletePassword: "wrongCustomPassword",
    });

    assert(customInvalid.isValid === false, "Wrong custom delete password should be rejected");
  } catch (err) {
    console.error("Test error:", err);
    failed++;
  }

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
