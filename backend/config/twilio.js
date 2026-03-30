import twilio from "twilio";

// ─── Twilio Credentials (from .env) ──────────────────────────────────────────
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// Normalise: add "whatsapp:" prefix if the env var doesn't already include it
const _rawFrom = process.env.TWILIO_WHATSAPP_NUMBER;
const WHATSAPP_FROM = _rawFrom
  ? _rawFrom.startsWith("whatsapp:")
    ? _rawFrom
    : `whatsapp:${_rawFrom}`
  : undefined;

// ─── Validate required env vars ──────────────────────────────────────────────
if (!ACCOUNT_SID || !AUTH_TOKEN || !WHATSAPP_FROM) {
  console.warn(
    "[Twilio] Missing one or more required env vars: " +
      "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER",
  );
}

// ─── Twilio client instance ───────────────────────────────────────────────────
let client = null;

if (ACCOUNT_SID && AUTH_TOKEN) {
  client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  console.log("[Twilio] Client initialised successfully.");
}

/**
 * Send a WhatsApp message via Twilio.
 *
 * @param {string} to       Recipient phone in E.164 format, e.g. "+919876543210"
 * @param {string} body     Message text
 * @returns {Promise<object>} Twilio message object
 */
export const sendWhatsAppMessage = async (to, body) => {
  if (!client) {
    throw new Error(
      "[Twilio] Client is not initialised. Check your credentials.",
    );
  }

  // Normalise the "to" number – add whatsapp: prefix if missing
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const message = await client.messages.create({
    from: WHATSAPP_FROM,
    to: toFormatted,
    body,
  });

  console.log(
    `[Twilio] WhatsApp message sent | SID: ${message.sid} | To: ${toFormatted}`,
  );
  return message;
};

/**
 * Verify that the Twilio credentials are valid by fetching the account info.
 *
 * @returns {Promise<object>} Account details object
 */
export const verifyTwilioConnection = async () => {
  if (!client) {
    throw new Error(
      "[Twilio] Client is not initialised. Check your credentials.",
    );
  }

  const account = await client.api.accounts(ACCOUNT_SID).fetch();
  console.log(
    `[Twilio] Connection verified | Account: ${account.friendlyName} | Status: ${account.status}`,
  );
  return account;
};

export { client as twilioClient, WHATSAPP_FROM };
export default client;
