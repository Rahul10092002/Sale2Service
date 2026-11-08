import { Router } from "express";
import { authenticate, checkPermission } from "../middleware/auth.js";
import { DiwaliCampaign, DiwaliRecipient, DiwaliAttempt } from "../models/DiwaliCampaign.js";
import { DIWALI_SHOP_ID, DIWALI_CONTENT } from "../../shared/diwaliCampaign.js";
import { audiencePreview, campaignQuery, campaignScope, prepareCampaign, setCampaignRunning, retryFailed } from "../services/diwaliCampaignService.js";

const router = Router();
router.use(authenticate, (req, res, next) => {
  if (String(req.user.shopId) !== DIWALI_SHOP_ID) return res.status(403).json({ message: "Campaign unavailable for this shop" });
  next();
});

router.get("/", checkPermission("schedules_view"), async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const statuses = ["QUEUED", "SKIPPED", "SENDING", "UNKNOWN", "ACCEPTED", "SENT", "DELIVERED", "READ", "FAILED"];
  const filter = { ...campaignScope };
  if (statuses.includes(req.query.status)) filter.status = req.query.status;
  const campaign = await DiwaliCampaign.findOne(campaignQuery).select("-lease_token").lean();
  if (!campaign) {
    const preview = await audiencePreview();
    return res.json({ campaign: null, preview: { total: preview.recipients.length, eligible: preview.recipients.filter(row => row.status === "QUEUED").length,
      skipped: preview.recipients.filter(row => row.status === "SKIPPED").length, shop_name_hi: preview.shop_name_hi }, content: DIWALI_CONTENT });
  }
  const [recipients, total, counts, attemptCount] = await Promise.all([
    DiwaliRecipient.find(filter).sort({ _id: 1 }).skip((page - 1) * 50).limit(50).lean(),
    DiwaliRecipient.countDocuments(filter),
    DiwaliRecipient.aggregate([{ $match: campaignScope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    DiwaliAttempt.countDocuments(campaignScope),
  ]);
  res.json({ campaign, recipients, total, page, counts: Object.fromEntries(counts.map(row => [row._id, row.count])), attemptCount, content: DIWALI_CONTENT });
});

router.get("/attempts/:recipientId", checkPermission("schedules_view"), async (req, res) => {
  const attempts = await DiwaliAttempt.find({ ...campaignScope, recipient_id: req.params.recipientId }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ attempts });
});

const action = handler => async (req, res, next) => {
  try { await handler(req); res.json({ success: true }); }
  catch (error) {
    if (error.name === "MongoServerError" || error.name === "MongooseError") return next(error);
    res.status(400).json({ message: error.message });
  }
};
router.post("/prepare", checkPermission("schedules_create"), action(req => prepareCampaign({
  intervalSeconds: req.body.intervalSeconds, recipientCap: req.body.recipientCap,
  exclusions: req.body.exclusions, exclusionsReviewed: req.body.exclusionsReviewed,
})));
router.post("/start", checkPermission("schedules_edit"), action(req => {
  if (req.body.webhookConfirmed !== true) throw new Error("Confirm the delivery webhook is configured with crqid and the authentication header.");
  return setCampaignRunning(true);
}));
router.post("/pause", checkPermission("schedules_edit"), action(() => setCampaignRunning(false)));
router.post("/retry/:recipientId", checkPermission("schedules_edit"), action(req => retryFailed(req.params.recipientId)));
export default router;
