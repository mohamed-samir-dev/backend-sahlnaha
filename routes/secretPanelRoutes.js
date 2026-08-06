const express = require("express");
const router = express.Router();
const BlockedDevice = require("../models/BlockedDevice");
const DeviceLog = require("../models/DeviceLog");

// ── Auth middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers["x-internal-token"];
  if (!token || token !== process.env.ADMIN_INTERNAL_TOKEN)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── Device Logs ──────────────────────────────────────────────────────────────
// Upsert log (called from frontend middleware on every visit)
router.post("/device-logs", async (req, res) => {
  try {
    const { fingerprint, ip, userAgent, path } = req.body;
    if (!fingerprint && !ip && !userAgent) return res.status(400).json({ error: "at least one identifier required" });

    const filter = fingerprint ? { fingerprint } : ip ? { ip } : { userAgent };
    await DeviceLog.findOneAndUpdate(
      filter,
      { $set: { ip, userAgent, path, lastSeen: new Date() }, $setOnInsert: { fingerprint, firstSeen: new Date() }, $inc: { requestsCount: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all logs
router.get("/device-logs", auth, async (req, res) => {
  try {
    const logs = await DeviceLog.find().sort({ lastSeen: -1 }).limit(500).lean();
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update label / buyerName
router.patch("/device-logs/:id", auth, async (req, res) => {
  try {
    const { label, buyerName } = req.body;
    const doc = await DeviceLog.findByIdAndUpdate(req.params.id, { $set: { label, buyerName } }, { returnDocument: 'after' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete log
router.delete("/device-logs/:id", auth, async (req, res) => {
  try {
    await DeviceLog.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete ALL logs
router.delete("/device-logs", auth, async (req, res) => {
  try {
    await DeviceLog.deleteMany({});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Blocked Devices ──────────────────────────────────────────────────────────
// Check if blocked (called from Next.js middleware — no auth needed, fast)
router.post("/blocked-devices/check", async (req, res) => {
  try {
    const { fingerprint, ip } = req.body;
    const query = [];
    if (fingerprint) query.push({ fingerprint });
    if (ip) query.push({ ip });
    if (!query.length) return res.json({ blocked: false });

    const found = await BlockedDevice.findOne({ $or: query, isActive: true }).lean();
    res.json({ blocked: !!found });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all blocked devices
router.get("/blocked-devices", auth, async (req, res) => {
  try {
    const list = await BlockedDevice.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Block a device
router.post("/blocked-devices", auth, async (req, res) => {
  try {
    const { fingerprint, ip, userAgent, reason } = req.body;
    const doc = await BlockedDevice.create({ fingerprint, ip, userAgent, reason });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle isActive
router.patch("/blocked-devices/:id/toggle", auth, async (req, res) => {
  try {
    const doc = await BlockedDevice.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    doc.isActive = !doc.isActive;
    await doc.save();
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete blocked device
router.delete("/blocked-devices/:id", auth, async (req, res) => {
  try {
    await BlockedDevice.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete ALL blocked devices
router.delete("/blocked-devices", auth, async (req, res) => {
  try {
    await BlockedDevice.deleteMany({});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
