const express = require("express");
const router = express.Router();
const Checkout = require("../models/Checkout");
const DeviceLog = require("../models/DeviceLog");
const authMiddleware = require("../middleware/auth");

router.post("/", async (req, res) => {
  try {
    const deviceIp =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress;

    const checkout = new Checkout({ ...req.body, deviceIp });
    await checkout.save();

    // حدّث DeviceLog بمعلومات الطلب
    const { fingerprint, customer } = req.body;
    const orConditions = [];
    if (fingerprint) orConditions.push({ fingerprint });
    if (deviceIp) orConditions.push({ ip: deviceIp });
    if (orConditions.length) {
      await DeviceLog.findOneAndUpdate(
        { $or: orConditions },
        { $set: { orderId: checkout.orderId, buyerName: customer || null } }
      );
    }

    res.status(201).json({ ok: true, orderId: checkout.orderId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await Checkout.find().sort({ createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Checkout.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ ok: false, error: "not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const order = await Checkout.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { returnDocument: 'after' }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/:id/financials", authMiddleware, async (req, res) => {
  try {
    const { total, downPayment, months, monthlyPayment } = req.body;
    const order = await Checkout.findByIdAndUpdate(
      req.params.id,
      { total, downPayment, months, monthlyPayment },
      { returnDocument: 'after' }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Checkout.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
