export const DIWALI_SHOP_ID = "69bd050b4f47d2c7e3d5c433";
export const DIWALI_CAMPAIGN_ID = "dipawali_wish_2026";
export const DIWALI_TEMPLATE = "dipawali_wish";
// Fixed initial window: never roll this forward automatically after a restart.
export const DIWALI_INITIAL_DEADLINE = "2026-11-08T19:00:00+05:30";

export function campaignDeadlineReached(campaign, now = new Date()) {
  const deadline = new Date(campaign.send_until || DIWALI_INITIAL_DEADLINE).getTime();
  return !Number.isFinite(deadline) || now.getTime() >= deadline;
}

export function normalizeCampaignPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : null;
}

export function deliveryStatus(value) {
  const status = String(value || "").toLowerCase();
  if (/fail|reject|undeliver/.test(status)) return "FAILED";
  if (/read/.test(status)) return "READ";
  if (/deliver/.test(status)) return "DELIVERED";
  if (/sent|submit/.test(status)) return "SENT";
  return null;
}

export function isThrottle(value) {
  return /429|130429|131048|131056|131049|rate.?limit|spam|too many requests/i.test(String(value || ""));
}

// Never turn a late/duplicate webhook into a delivery regression.
export function allowedPreviousStatuses(status) {
  const base = ["SENDING", "UNKNOWN", "ACCEPTED", "SENT"];
  if (status === "READ") return [...base, "FAILED", "DELIVERED"];
  if (status === "DELIVERED") return [...base, "FAILED"];
  return base;
}

export const DIWALI_CONTENT = `नमस्ते आदरणीय 😊🙏

✨ आपको और आपके परिवार को दीपावली एवं नूतन वर्ष (गुड़ी पड़वा) की हार्दिक शुभकामनाएं! ✨🪔🎉

माँ लक्ष्मी और भगवान गणेश से प्रार्थना है कि दीपावली का यह पावन पर्व और अगले दिन से शुरू होने वाला नूतन वर्ष (गुड़ी पड़वा) आपके जीवन में सुख, शांति, समृद्धि, उत्तम स्वास्थ्य और अपार सफलता लेकर आए। 🙏🌸

🌟 नया वर्ष आपके लिए नई उम्मीदें, नए अवसर और ढेर सारी खुशियां लेकर आए। 🌟

🎁 🪔 दीपावली एवं नूतन वर्ष के शुभ अवसर पर आपके लिए खास ऑफर! 🎉

इस त्योहारी सीजन में हमारे विशेष ऑफर्स का लाभ उठाएं और अपनी खुशियों को दोगुना करें। 🛍️✨

❤️ आपका साथ और विश्वास हमारे लिए अनमोल है। आने वाले नए वर्ष में भी आपका स्नेह और विश्वास इसी तरह बना रहे, यही हमारी कामना है।

शुभ दीपावली 🪔 एवं नववर्ष मंगलमय हो! 🎊

धन्यवाद! 🙏
{{1}} की ओर से ❤️`;
