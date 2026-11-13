import GoogleAccount from "../models/GoogleAccount.js";
import GoogleContactSyncLog from "../models/GoogleContactSyncLog.js";
import Customer from "../models/Customer.js";
import {
  generateAuthUrl,
  handleOAuthCallback,
  disconnectGoogleAccount,
  retryFailedSyncs,
  syncCustomerToGoogleContacts,
} from "../services/googleContactsService.js";

/**
 * Returns connection and sync status for the current shop.
 */
export async function getStatus(req, res) {
  try {
    const shopId = req.user.shopId;
    const account = await GoogleAccount.findOne({
      shop_id: shopId,
      deleted_at: null,
    });

    const pendingFailures = await Customer.countDocuments({
      shop_id: shopId,
      deleted_at: null,
      "google_sync.status": "FAILED",
    });

    const unsyncedCount = await Customer.countDocuments({
      shop_id: shopId,
      deleted_at: null,
      $or: [
        { "google_sync.status": "NOT_SYNCED" },
        { "google_sync.status": { $exists: false } },
      ],
    });

    res.json({
      success: true,
      data: {
        is_connected: Boolean(account?.is_connected),
        connected_email: account?.connected_email || null,
        connected_name: account?.connected_name || null,
        connected_picture: account?.connected_picture || null,
        auto_sync_enabled: account?.auto_sync_enabled !== false,
        total_synced_contacts: account?.total_synced_contacts || 0,
        total_skipped_duplicates: account?.total_skipped_duplicates || 0,
        last_sync_at: account?.last_sync_at || null,
        last_sync_status: account?.last_sync_status || "IDLE",
        last_sync_error: account?.last_sync_error || null,
        pending_failures: pendingFailures,
        unsynced_customers: unsyncedCount,
      },
    });
  } catch (error) {
    console.error("Error getting Google Contacts status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load Google Contacts status",
      error: error.message,
    });
  }
}

/**
 * Generates Google OAuth consent URL.
 */
export async function getAuthUrl(req, res) {
  try {
    const shopId = req.user.shopId;
    const userId = req.user.userId;
    const { redirect_uri } = req.query;

    const authUrl = generateAuthUrl({
      shopId,
      userId,
      redirectUri: redirect_uri,
    });

    res.json({
      success: true,
      data: { auth_url: authUrl },
    });
  } catch (error) {
    console.error("Error generating Google Auth URL:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate authorization URL",
    });
  }
}

/**
 * Handles browser callback directly from Google OAuth redirect.
 */
export async function handleCallback(req, res) {
  const { code, state, error } = req.query;
  const frontendUrl =
    (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

  if (error) {
    console.error("Google OAuth returned error:", error);
    return res.redirect(
      `${frontendUrl}/settings?tab=google&google_sync=error&message=${encodeURIComponent(
        error
      )}`
    );
  }

  if (!code || !state) {
    return res.redirect(
      `${frontendUrl}/settings?tab=google&google_sync=error&message=${encodeURIComponent(
        "Missing authorization parameters"
      )}`
    );
  }

  try {
    await handleOAuthCallback({ code, state });
    res.redirect(`${frontendUrl}/settings?tab=google&google_sync=success`);
  } catch (err) {
    console.error("OAuth callback processing failed:", err);
    res.redirect(
      `${frontendUrl}/settings?tab=google&google_sync=error&message=${encodeURIComponent(
        err.message || "Authentication failed"
      )}`
    );
  }
}

/**
 * JSON API for frontend OAuth code exchange.
 */
export async function exchangeCode(req, res) {
  try {
    const { code, state, redirect_uri } = req.body;
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: "Code and state are required",
      });
    }

    const result = await handleOAuthCallback({
      code,
      state,
      customRedirectUri: redirect_uri,
    });

    res.json({
      success: true,
      message: "Google Account connected successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error exchanging OAuth code:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to exchange authorization code",
    });
  }
}

/**
 * Toggles auto-sync enabled/disabled for current shop.
 */
export async function toggleAutoSync(req, res) {
  try {
    const shopId = req.user.shopId;
    const { enabled } = req.body;

    const account = await GoogleAccount.findOneAndUpdate(
      { shop_id: shopId, deleted_at: null },
      { $set: { auto_sync_enabled: Boolean(enabled) } },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Google Account not connected",
      });
    }

    res.json({
      success: true,
      message: `Auto-sync ${account.auto_sync_enabled ? "enabled" : "disabled"}`,
      data: { auto_sync_enabled: account.auto_sync_enabled },
    });
  } catch (error) {
    console.error("Error toggling auto-sync:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle auto-sync setting",
    });
  }
}

/**
 * Disconnects the Google Account for the current shop.
 */
export async function disconnect(req, res) {
  try {
    const shopId = req.user.shopId;
    await disconnectGoogleAccount(shopId);

    res.json({
      success: true,
      message: "Google Account disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Google Account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disconnect Google Account",
    });
  }
}

/**
 * Retries sync for failed or unsynced customers in the current shop.
 */
export async function retrySync(req, res) {
  try {
    const shopId = req.user.shopId;
    const result = await retryFailedSyncs(shopId);

    res.json({
      success: true,
      message: `Sync retry completed: ${result.synced} created, ${result.skipped} existing, ${result.failed} failed.`,
      data: result,
    });
  } catch (error) {
    console.error("Error retrying sync:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retry sync",
    });
  }
}

/**
 * Syncs a single customer manually.
 */
export async function syncSingleCustomer(req, res) {
  try {
    const shopId = req.user.shopId;
    const { customerId } = req.params;

    const customer = await Customer.findOne({
      _id: customerId,
      shop_id: shopId,
      deleted_at: null,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const result = await syncCustomerToGoogleContacts({
      shopId,
      customer,
      force: true,
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Error syncing customer:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync customer",
    });
  }
}

/**
 * Fetches recent sync logs for the current shop.
 */
export async function getLogs(req, res) {
  try {
    const shopId = req.user.shopId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      GoogleContactSyncLog.find({ shop_id: shopId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GoogleContactSyncLog.countDocuments({ shop_id: shopId }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching sync logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sync logs",
    });
  }
}

