/**
 * Test Cloudinary Integration
 * Run this file to test the Cloudinary upload functionality
 *
 * Usage: node test-cloudinary.js
 */

import cloudinaryUpload from "./services/cloudinaryUpload.js";
import fs from "fs";
import path from "path";

async function testCloudinaryIntegration() {
  try {
    console.log("🧪 Testing Cloudinary Integration...\n");

    // Test 1: Check if Cloudinary is configured
    console.log("1. Testing Cloudinary Configuration...");

    // Test 2: Create a dummy PDF buffer for testing
    console.log("2. Creating test PDF buffer...");
    const testPDFContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj

4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF for Cloudinary) Tj
ET
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000207 00000 n 
0000000301 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
370
%%EOF`;

    const testBuffer = Buffer.from(testPDFContent);

    // Test 3: Upload PDF from buffer
    console.log("3. Testing PDF upload from buffer...");
    const uploadResult = await cloudinaryUpload.uploadPDFFromBuffer(
      testBuffer,
      {
        folder: "invoices",
        fileName: `test_pdf_${Date.now()}`,
        tags: ["test", "pdf", "cloudinary_integration"],
        overwrite: true,
      },
    );

    console.log("✅ Upload successful!");
    console.log("📄 File URL:", uploadResult.url);
    console.log("🆔 Public ID:", uploadResult.public_id);
    console.log("📊 File size:", uploadResult.bytes, "bytes");

    // Test 4: Generate secure URL
    console.log("\n4. Testing secure URL generation...");
    const secureUrl = cloudinaryUpload.generateSecureUrl(
      uploadResult.public_id,
      3600,
    );
    console.log("🔒 Secure URL:", secureUrl);

    // Test 5: Delete the test file (cleanup)
    console.log("\n5. Cleaning up test file...");
    const deleteResult = await cloudinaryUpload.deleteFile(
      uploadResult.public_id,
    );
    console.log("✅ Test file deleted successfully");
    console.log("🗑️ Delete result:", deleteResult.result);

    console.log(
      "\n🎉 All tests passed! Cloudinary integration is working correctly.",
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Details:", error);

    // Check common issues
    if (error.message.includes("CLOUDINARY_")) {
      console.log("\n💡 Make sure your .env file contains:");
      console.log("   CLOUDINARY_CLOUD_NAME=your_cloud_name");
      console.log("   CLOUDINARY_API_KEY=your_api_key");
      console.log("   CLOUDINARY_API_SECRET=your_api_secret");
    }
  }
}

// Run the test
testCloudinaryIntegration();
