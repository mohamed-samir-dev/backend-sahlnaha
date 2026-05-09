const Product = require("../models/Product");

function normalizeArabic(str) {
  return str
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

const LIST_SELECT = "name image category subCategory brand color storage salePrice originalPrice inStock freeDelivery deliveryTime warrantyYears installment taxIncluded colors discountPercent price";

exports.getProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json(await Product.find().select(LIST_SELECT));

    const normalized = normalizeArabic(q.trim());
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const candidates = await Product.find(
      { name: { $regex: escaped.slice(0, 3), $options: "i" } }
    ).select(LIST_SELECT);

    const filtered = candidates.filter((p) =>
      normalizeArabic(p.name).includes(normalized)
    );
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message || "خطأ في الخادم" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message || "خطأ في الخادم" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};
