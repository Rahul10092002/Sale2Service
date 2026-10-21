import assert from "assert";

// Ponytail self-check for phone search & regex escaping logic
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractPhoneSearch = (term) => {
  const searchTrimmed = term.trim();
  const escapedSearch = escapeRegex(searchTrimmed);
  const regex = new RegExp(escapedSearch, "i");
  const cleanDigits = searchTrimmed.replace(/\D/g, "");
  const phoneRegexList = [regex];
  if (cleanDigits.length >= 3) {
    phoneRegexList.push(new RegExp(cleanDigits, "i"));
    if (cleanDigits.length >= 10) {
      phoneRegexList.push(new RegExp(cleanDigits.slice(-10), "i"));
    }
  }
  return { phoneRegexList, cleanDigits };
};

// 1. Unescaped plus does not throw SyntaxError
assert.doesNotThrow(() => extractPhoneSearch("+91 98765 43210"));

// 2. Extracts last 10 digits accurately
const res1 = extractPhoneSearch("+91 98765-43210");
assert.ok(res1.phoneRegexList.some((r) => r.test("9876543210")));

// 3. Normalized 10-digit number matches
const res2 = extractPhoneSearch("09876543210");
assert.ok(res2.phoneRegexList.some((r) => r.test("9876543210")));

// 4. Partial number matches
const res3 = extractPhoneSearch("43210");
assert.ok(res3.phoneRegexList.some((r) => r.test("9876543210")));

console.log("✓ All phone search logic assertions passed.");
