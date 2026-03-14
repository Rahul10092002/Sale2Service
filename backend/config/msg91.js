import axios from "axios";
import MessageLog from "../models/MessageLog.js";
import mongoose from "mongoose";


export const sendWhatsappMessageViaMSG91 = async ({
  templateName,
  to,
  components = [],
  media = null,
  // optional metadata for logging
  hospitalId = null,
  campaignName = null,
  userName = null,
  messageType = null,
}) => {
  // helper: safe decrypt (no-op for plaintext, placeholder for real decryption)
  const safeDecrypt = (val) => {
    try {
      // implement decryption if needed; for now return as-is
      return val;
    } catch (e) {
      return val;
    }
  };

  const normalizePhone = (raw) => {
    if (!raw) return raw;
    let p = String(raw).trim();
    // remove non-digits and plus
    p = p.replace(/[^\d+]/g, "");
    // if starts with 0, strip it
    if (/^0+/.test(p)) {
      p = p.replace(/^0+/, "");
    }
    // add default country code if length == 10
    if (!p.startsWith("+") && p.length === 10) {
      p = "+91" + p;
    }
    // ensure plus sign
    if (!p.startsWith("+")) p = "+" + p;
    return p;
  };

  // validate endpoint URL early to avoid axios "Invalid URL"
  console.log("MSG91_API_ENDPOINT:", process.env.MSG91_API_ENDPOINT);
  try {
    // eslint-disable-next-line no-new
    new URL(process.env.MSG91_API_ENDPOINT);
  } catch (urlErr) {
    console.error(
      "MSG91 WhatsApp Error: MSG91_API_ENDPOINT is missing or invalid",
      process.env.MSG91_API_ENDPOINT,
    );
    return null;
  }

  try {
    // Build component payload as MSG91 expects simple indexed body_x fields
    const componentPayload = {};

    // If components is an object (variables), convert to array of values
    const compArray = Array.isArray(components)
      ? components
      : Object.values(components || {});

    // Decrypt or sanitize components
    const decryptedComponents = compArray.map((c) => safeDecrypt(c));

    decryptedComponents.forEach((value, index) => {
      componentPayload[`body_${index + 1}`] = {
        type: "text",
        value: value || "",
      };
    });

    if (media && media.url) {
      componentPayload["header_1"] = {
        type: "document",
        filename: media.filename || "document.pdf",
        value: media.url,
      };
    }

    const phoneNumber = normalizePhone(to);

    const payload = {
      integrated_number: process.env.MSG91_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en",
            policy: "deterministic",
          },
          namespace: process.env.MSG91_NAMESPACE,
          to_and_components: [
            {
              to: [phoneNumber],
              components: componentPayload,
            },
          ],
        },
      },
    };

    const resp = await axios.post(process.env.MSG91_API_ENDPOINT, payload, {
      headers: {
        "Content-Type": "application/json",
        Authkey: process.env.MSG91_AUTHKEY,
      },
      timeout: 15000,
    });

    const respData = resp?.data;

    const successFlag = Boolean(
      respData &&
      (respData.success === true ||
        respData.status === "success" ||
        respData?.hasError === false),
    );

    const status = successFlag ? "success" : "failed";

    // Attempt to create a MessageLog entry only if mongoose connected
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await MessageLog.create({
          hospitalId,
          campaignName: campaignName || templateName,
          destination: phoneNumber,
          userName:
            userName ||
            (Array.isArray(decryptedComponents) && decryptedComponents[0]) ||
            "",
          status,
          messageType: messageType || undefined,
          meta: { response: respData },
        });
      } else {
        console.warn("Skipping MessageLog.create: mongoose not connected");
      }
    } catch (logErr) {
      console.error("Failed to create MessageLog for MSG91 response", logErr);
    }

    return respData;
  } catch (error) {
    console.error(
      "MSG91 WhatsApp Error:",
      error?.response?.data || error.message,
    );

    // In case of error, attempt to log only if mongoose connected
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await MessageLog.create({
          hospitalId: null,
          campaignName: campaignName || templateName,
          destination: to,
          userName:
            userName || (Array.isArray(components) && components[0]) || "",
          status: "error",
          messageType: messageType || undefined,
          meta: { error: error?.response?.data || error.message },
        });
      } else {
        console.warn(
          "Skipping MessageLog.create for error: mongoose not connected",
        );
      }
    } catch (logErr) {
      console.error("Failed to create MessageLog for MSG91 error", logErr);
    }

    return null;
  }
};

export default sendWhatsappMessageViaMSG91;

/**
 * Send plain text WhatsApp message via MSG91
 * Expects same env vars as template sender
 */
export const sendTextMessageViaMSG91 = async ({ to, message }) => {
  try {
    const payload = {
      integrated_number: process.env.MSG91_NUMBER,
      content_type: "text",
      payload: {
        messaging_product: "whatsapp",
        to: [to],
        text: {
          body: message,
        },
      },
    };

    const resp = await axios.post(process.env.MSG91_API_ENDPOINT, payload, {
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTHKEY,
      },
      timeout: 15000,
    });

    return resp.data;
  } catch (error) {
    console.error(
      "MSG91 text send error:",
      error?.response?.data || error.message,
    );
    throw error;
  }
};
