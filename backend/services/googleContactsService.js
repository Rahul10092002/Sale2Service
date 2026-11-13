import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import GoogleAccount from "../models/GoogleAccount.js";
import GoogleContactSyncLog from "../models/GoogleContactSyncLog.js";
import Customer from "../models/Customer.js";
import { encryptToken, decryptToken } from "../utils/encryption.js";
import { normalizeIndianPhone, arePhonesEqual } from "../utils/phoneUtils.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "https://warrantydesk.in/auth/google/callback";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

/**
 * Creates an OAuth2 client instance
 * @param {string} [redirectUri]
 * @returns {OAuth2Client}
 */
export function getOAuth2Client(redirectUri) {
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri || GOOGLE_REDIRECT_URI
  );
}

/**
 * Generates the Google OAuth 2.0 authorization URL with signed state.
 * @param {object} params
 * @param {string} params.shopId - Shop ID
 * @param {string} params.userId - User ID
 * @param {string} [params.redirectUri] - Optional custom redirect URI
 * @returns {string} Google authorization URL
 */
export function generateAuthUrl({ shopId, userId, redirectUri }) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured in environment variables."
    );
  }

  const effectiveRedirectUri = redirectUri || GOOGLE_REDIRECT_URI;
  const oauth2Client = getOAuth2Client(effectiveRedirectUri);

  // Signed JWT state to prevent CSRF and carry shopId securely
  const statePayload = {
    shopId: String(shopId),
    userId: String(userId),
    redirectUri: effectiveRedirectUri,
    nonce: randomUUID(),
  };

  const jwtSecret =
    process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || "google-oauth-state-secret";
  const state = jwt.sign(statePayload, jwtSecret, { expiresIn: "30m" });

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Forces Google to provide a refresh_token every time
    scope: GOOGLE_SCOPES,
    state,
  });
}

/**
 * Handles the OAuth2 callback, exchanging code for tokens and saving encrypted credentials.
 * @param {object} params
 * @param {string} params.code - Authorization code from Google
 * @param {string} params.state - JWT state token
 * @param {string} [params.customRedirectUri]
 * @returns {Promise<{ shopId: string, email: string, name: string }>}
 */
export async function handleOAuthCallback({ code, state, customRedirectUri }) {
  if (!code) {
    throw new Error("Missing authorization code");
  }

  const jwtSecret =
    process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || "google-oauth-state-secret";

  let decoded;
  try {
    decoded = jwt.verify(state, jwtSecret);
  } catch (err) {
    throw new Error("Invalid or expired OAuth state parameter. Please try connecting again.");
  }

  const { shopId, redirectUri: storedRedirectUri } = decoded;
  const effectiveRedirectUri = customRedirectUri || storedRedirectUri || GOOGLE_REDIRECT_URI;

  const oauth2Client = getOAuth2Client(effectiveRedirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  // Fetch Google User Profile
  let profile = { email: "", name: "", picture: "" };
  try {
    const userInfoRes = await oauth2Client.request({
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
    });
    if (userInfoRes?.data) {
      profile.email = userInfoRes.data.email || "";
      profile.name = userInfoRes.data.name || "";
      profile.picture = userInfoRes.data.picture || "";
    }
  } catch (profileErr) {
    console.warn("Could not fetch Google profile details:", profileErr.message);
  }

  // Encrypt Refresh Token using AES-256-GCM
  let encrypted = null;
  if (tokens.refresh_token) {
    encrypted = encryptToken(tokens.refresh_token);
  } else {
    // If no refresh token returned (e.g. re-prompting without prompt=consent), check existing
    const existing = await GoogleAccount.findOne({ shop_id: shopId, deleted_at: null });
    if (existing?.refresh_token_encrypted) {
      encrypted = {
        ciphertext: existing.refresh_token_encrypted,
        iv: existing.refresh_token_iv,
        tag: existing.refresh_token_tag,
      };
    } else {
      throw new Error(
        "Google did not provide a refresh token. Please disconnect access in Google Account Settings and reconnect."
      );
    }
  }

  const updateData = {
    shop_id: shopId,
    connected_email: profile.email,
    connected_name: profile.name,
    connected_picture: profile.picture,
    access_token: tokens.access_token,
    access_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    refresh_token_encrypted: encrypted.ciphertext,
    refresh_token_iv: encrypted.iv,
    refresh_token_tag: encrypted.tag,
    is_connected: true,
    auto_sync_enabled: true,
    scope: tokens.scope ? tokens.scope.split(" ") : GOOGLE_SCOPES,
    last_sync_status: "IDLE",
    last_sync_error: null,
    deleted_at: null,
  };

  await GoogleAccount.findOneAndUpdate(
    { shop_id: shopId },
    { $set: updateData },
    { upsert: true, new: true }
  );

  return {
    shopId,
    email: profile.email,
    name: profile.name,
  };
}

/**
 * Retrieves an authenticated OAuth2Client for a specific shop, automatically handling token refresh.
 * @param {string} shopId
 * @returns {Promise<OAuth2Client | null>}
 */
export async function getAuthenticatedClient(shopId) {
  const account = await GoogleAccount.findOne({
    shop_id: shopId,
    deleted_at: null,
    is_connected: true,
  });

  if (!account || !account.refresh_token_encrypted) {
    return null;
  }

  const refreshToken = decryptToken({
    ciphertext: account.refresh_token_encrypted,
    iv: account.refresh_token_iv,
    tag: account.refresh_token_tag,
  });

  if (!refreshToken) {
    console.error("Failed to decrypt Google refresh token for shop:", shopId);
    return null;
  }

  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: account.access_token,
    expiry_date: account.access_token_expires_at
      ? new Date(account.access_token_expires_at).getTime()
      : undefined,
  });

  // Listen for automatic token refreshes by google-auth-library
  oauth2Client.on("tokens", async (tokens) => {
    try {
      const update = {};
      if (tokens.access_token) {
        update.access_token = tokens.access_token;
      }
      if (tokens.expiry_date) {
        update.access_token_expires_at = new Date(tokens.expiry_date);
      }
      if (tokens.refresh_token) {
        const enc = encryptToken(tokens.refresh_token);
        update.refresh_token_encrypted = enc.ciphertext;
        update.refresh_token_iv = enc.iv;
        update.refresh_token_tag = enc.tag;
      }
      await GoogleAccount.updateOne({ shop_id: shopId }, { $set: update });
    } catch (saveErr) {
      console.error("Error saving auto-refreshed Google tokens:", saveErr);
    }
  });

  return oauth2Client;
}

/**
 * Searches Google Contacts using the People API to check if a phone number already exists.
 * @param {OAuth2Client} client
 * @param {{ formatted: string, national: string }} phoneInfo
 * @returns {Promise<{ exists: boolean, resourceName?: string, displayName?: string }>}
 */
export async function checkContactExists(client, phoneInfo) {
  if (!phoneInfo || !phoneInfo.national) {
    return { exists: false };
  }

  try {
    // Search contacts by the 10-digit national number
    const res = await client.request({
      url: "https://people.googleapis.com/v1/people:searchContacts",
      params: {
        query: phoneInfo.national,
        readMask: "names,phoneNumbers",
      },
    });

    const results = res.data?.results || [];

    for (const item of results) {
      const person = item.person;
      if (!person) continue;

      const phoneNumbers = person.phoneNumbers || [];
      for (const p of phoneNumbers) {
        if (arePhonesEqual(p.value, phoneInfo.formatted) || arePhonesEqual(p.canonicalForm, phoneInfo.formatted)) {
          const displayName = person.names?.[0]?.displayName || "Existing Contact";
          return {
            exists: true,
            resourceName: person.resourceName,
            displayName,
          };
        }
      }
    }

    // Secondary check with full +91 formatted number if query differed
    if (phoneInfo.formatted && phoneInfo.formatted !== phoneInfo.national) {
      const resFormatted = await client.request({
        url: "https://people.googleapis.com/v1/people:searchContacts",
        params: {
          query: phoneInfo.formatted,
          readMask: "names,phoneNumbers",
        },
      });

      const formattedResults = resFormatted.data?.results || [];
      for (const item of formattedResults) {
        const person = item.person;
        if (!person) continue;

        const phoneNumbers = person.phoneNumbers || [];
        for (const p of phoneNumbers) {
          if (arePhonesEqual(p.value, phoneInfo.formatted)) {
            const displayName = person.names?.[0]?.displayName || "Existing Contact";
            return {
              exists: true,
              resourceName: person.resourceName,
              displayName,
            };
          }
        }
      }
    }

    return { exists: false };
  } catch (err) {
    console.error("Error searching Google Contacts:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Creates a new contact in Google Contacts via Google People API.
 * @param {OAuth2Client} client
 * @param {object} params
 * @param {string} params.name - Full name of customer
 * @param {{ formatted: string, national: string }} params.phoneInfo - Normalized phone
 * @param {string} [params.email]
 * @param {string} [params.address]
 * @param {string} [params.notes]
 * @returns {Promise<{ success: boolean, resourceName: string }>}
 */
export async function createGoogleContact(client, { name, phoneInfo, email, address, notes }) {
  const cleanName = (name || "Customer").trim();
  const nameParts = cleanName.split(/\s+/);
  const givenName = nameParts[0] || "Customer";
  const familyName = nameParts.slice(1).join(" ") || "";

  const contactPayload = {
    names: [
      {
        givenName,
        familyName,
      },
    ],
    phoneNumbers: [
      {
        value: phoneInfo.formatted, // e.g. +919876543210
        type: "mobile",
      },
    ],
    userDefined: [
      {
        key: "Source",
        value: "WarrantyDesk",
      },
    ],
  };

  if (email && /^\S+@\S+\.\S+$/.test(email)) {
    contactPayload.emailAddresses = [
      {
        value: email.trim().toLowerCase(),
        type: "home",
      },
    ];
  }

  if (address && typeof address === "string" && address.trim()) {
    contactPayload.postalAddresses = [
      {
        formattedValue: address.trim(),
        type: "home",
      },
    ];
  }

  if (notes && typeof notes === "string" && notes.trim()) {
    contactPayload.biographies = [
      {
        value: notes.trim(),
        contentType: "TEXT_PLAIN",
      },
    ];
  }

  try {
    const res = await client.request({
      url: "https://people.googleapis.com/v1/people:createContact",
      method: "POST",
      data: contactPayload,
    });

    return {
      success: true,
      resourceName: res.data?.resourceName || "",
    };
  } catch (err) {
    console.error("Error creating Google contact:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * High-level auto-sync function invoked whenever a customer bill is generated.
 * Checks for connected account, normalizes phone (+91), deduplicates, creates contact,
 * updates customer sync status and logs activity.
 *
 * @param {object} params
 * @param {string} params.shopId - Tenant shop ID
 * @param {object} params.customer - Customer document or plain object
 * @param {string} [params.invoiceId] - Associated invoice ID
 * @param {boolean} [params.force=false] - Whether to bypass already-synced flag
 * @returns {Promise<{ success: boolean, action: string, message?: string }>}
 */
export async function syncCustomerToGoogleContacts({ shopId, customer, invoiceId, force = false }) {
  if (!shopId || !customer) {
    return { success: false, action: "SKIPPED", message: "Missing shopId or customer" };
  }

  try {
    // 1. Verify that this shop has an active connected Google Account with auto_sync enabled
    const account = await GoogleAccount.findOne({
      shop_id: shopId,
      deleted_at: null,
      is_connected: true,
    });

    if (!account) {
      return { success: false, action: "NOT_CONNECTED", message: "Google account not connected" };
    }

    if (!account.auto_sync_enabled && !force) {
      return { success: false, action: "DISABLED", message: "Google Contacts auto-sync is disabled" };
    }

    // 2. Normalize customer phone number to +91 format
    const rawPhone = customer.whatsapp_number || customer.phone || customer.mobile;
    const phoneInfo = normalizeIndianPhone(rawPhone);

    if (!phoneInfo.isValid) {
      await GoogleContactSyncLog.create({
        shop_id: shopId,
        customer_id: customer._id || customer.id,
        invoice_id: invoiceId,
        customer_name: customer.full_name || customer.name || "Unknown",
        phone_number: String(rawPhone || ""),
        action: "FAILED",
        error_message: "Invalid phone number for Indian mobile (+91 format required)",
      });
      return { success: false, action: "INVALID_PHONE", message: "Invalid phone number" };
    }

    // 3. Skip if already synced and not forced
    if (customer.google_sync?.status === "SYNCED" && !force) {
      return {
        success: true,
        action: "ALREADY_SYNCED",
        message: "Customer already synced to Google Contacts",
      };
    }

    // 4. Get authenticated client (with automatic token refresh)
    const client = await getAuthenticatedClient(shopId);
    if (!client) {
      await GoogleAccount.updateOne(
        { shop_id: shopId },
        {
          $set: {
            last_sync_status: "FAILED",
            last_sync_error: "Authentication failed. Reconnect Google account.",
          },
        }
      );
      return { success: false, action: "AUTH_FAILED", message: "Failed to authenticate Google client" };
    }

    const customerName =
      customer.full_name ||
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      "Customer";

    // 5. Check if contact with same phone number already exists
    const existing = await checkContactExists(client, phoneInfo);

    if (existing.exists) {
      // Duplicate found — SKIP to prevent duplicates
      await GoogleContactSyncLog.create({
        shop_id: shopId,
        customer_id: customer._id || customer.id,
        invoice_id: invoiceId,
        customer_name: customerName,
        phone_number: phoneInfo.formatted,
        action: "SKIPPED_DUPLICATE",
        google_resource_name: existing.resourceName,
        error_message: null,
      });

      await Customer.updateOne(
        { _id: customer._id || customer.id, shop_id: shopId },
        {
          $set: {
            "google_sync.synced": true,
            "google_sync.status": "SKIPPED_DUPLICATE",
            "google_sync.google_resource_name": existing.resourceName,
            "google_sync.synced_at": new Date(),
            "google_sync.error_message": null,
          },
        }
      );

      await GoogleAccount.updateOne(
        { shop_id: shopId },
        {
          $inc: { total_skipped_duplicates: 1 },
          $set: {
            last_sync_at: new Date(),
            last_sync_status: "SUCCESS",
            last_sync_error: null,
          },
        }
      );

      return {
        success: true,
        action: "SKIPPED_DUPLICATE",
        message: `Phone number ${phoneInfo.formatted} already exists in Google Contacts (${existing.displayName || ""}). Skipped duplicate.`,
      };
    }

    // 6. Contact does not exist — Create new contact!
    let customerAddress = "";
    if (customer.address) {
      if (typeof customer.address === "string") {
        customerAddress = customer.address;
      } else {
        customerAddress = [
          customer.address.line1,
          customer.address.line2,
          customer.address.city,
          customer.address.state,
          customer.address.pincode,
        ]
          .filter(Boolean)
          .join(", ");
      }
    }

    const createResult = await createGoogleContact(client, {
      name: customerName,
      phoneInfo,
      email: customer.email,
      address: customerAddress,
      notes: `WarrantyDesk Customer. Registered: ${new Date().toLocaleDateString("en-IN")}`,
    });

    // 7. Update status and logs
    await GoogleContactSyncLog.create({
      shop_id: shopId,
      customer_id: customer._id || customer.id,
      invoice_id: invoiceId,
      customer_name: customerName,
      phone_number: phoneInfo.formatted,
      action: "CREATED",
      google_resource_name: createResult.resourceName,
      error_message: null,
    });

    await Customer.updateOne(
      { _id: customer._id || customer.id, shop_id: shopId },
      {
        $set: {
          "google_sync.synced": true,
          "google_sync.status": "SYNCED",
          "google_sync.google_resource_name": createResult.resourceName,
          "google_sync.synced_at": new Date(),
          "google_sync.error_message": null,
        },
      }
    );

    await GoogleAccount.updateOne(
      { shop_id: shopId },
      {
        $inc: { total_synced_contacts: 1 },
        $set: {
          last_sync_at: new Date(),
          last_sync_status: "SUCCESS",
          last_sync_error: null,
        },
      }
    );

    return {
      success: true,
      action: "CREATED",
      message: `Created new contact for ${customerName} (${phoneInfo.formatted})`,
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || "Failed to sync contact";
    console.error("Google Contacts sync error:", errorMsg);

    // Record failure in log and customer
    try {
      await GoogleContactSyncLog.create({
        shop_id: shopId,
        customer_id: customer._id || customer.id,
        invoice_id: invoiceId,
        customer_name: customer.full_name || customer.name || "Customer",
        phone_number: customer.whatsapp_number || "",
        action: "FAILED",
        error_message: errorMsg,
      });

      await Customer.updateOne(
        { _id: customer._id || customer.id, shop_id: shopId },
        {
          $set: {
            "google_sync.synced": false,
            "google_sync.status": "FAILED",
            "google_sync.error_message": errorMsg,
            "google_sync.last_attempt_at": new Date(),
          },
          $inc: { "google_sync.retry_count": 1 },
        }
      );

      await GoogleAccount.updateOne(
        { shop_id: shopId },
        {
          $set: {
            last_sync_status: "FAILED",
            last_sync_error: errorMsg,
          },
        }
      );
    } catch (logErr) {
      console.error("Failed to record Google sync error log:", logErr);
    }

    return {
      success: false,
      action: "FAILED",
      message: errorMsg,
    };
  }
}

/**
 * Disconnects the Google Account for a shop and revokes token if possible.
 * @param {string} shopId
 * @returns {Promise<boolean>}
 */
export async function disconnectGoogleAccount(shopId) {
  const account = await GoogleAccount.findOne({
    shop_id: shopId,
    deleted_at: null,
    is_connected: true,
  });

  if (!account) return true;

  try {
    const refreshToken = decryptToken({
      ciphertext: account.refresh_token_encrypted,
      iv: account.refresh_token_iv,
      tag: account.refresh_token_tag,
    });

    if (refreshToken) {
      const client = getOAuth2Client();
      await client.revokeToken(refreshToken).catch(() => {});
    }
  } catch (err) {
    console.warn("Token revocation failed (proceeding with local disconnect):", err.message);
  }

  account.is_connected = false;
  account.access_token = null;
  account.access_token_expires_at = null;
  account.refresh_token_encrypted = null;
  account.refresh_token_iv = null;
  account.refresh_token_tag = null;
  account.last_sync_status = "IDLE";
  account.last_sync_error = null;
  await account.save();

  return true;
}

/**
 * Retries sync for any failed or unsynced customers in the shop.
 * @param {string} shopId
 * @returns {Promise<{ total: number, synced: number, skipped: number, failed: number }>}
 */
export async function retryFailedSyncs(shopId) {
  const unsyncedCustomers = await Customer.find({
    shop_id: shopId,
    deleted_at: null,
    $or: [
      { "google_sync.status": "FAILED" },
      { "google_sync.status": "NOT_SYNCED" },
      { "google_sync.status": { $exists: false } },
    ],
  }).limit(50); // Safe batch size

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const customer of unsyncedCustomers) {
    const res = await syncCustomerToGoogleContacts({
      shopId,
      customer,
      force: true,
    });

    if (res.success) {
      if (res.action === "CREATED") synced++;
      else skipped++;
    } else {
      failed++;
    }

    // 200ms throttle between calls to comply with Google People API rate limits
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return {
    total: unsyncedCustomers.length,
    synced,
    skipped,
    failed,
  };
}

