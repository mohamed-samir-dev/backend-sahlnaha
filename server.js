require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const adminRoutes = require("./routes/adminRoutes");
const secretPanelRoutes = require("./routes/secretPanelRoutes");

connectDB();

const app = express();

app.use((req, res, next) => {
  if (req.hostname === "madaar-electronics.com" || req.hostname === "www.madaar-electronics.com") {
    return res.redirect(301, "https://madar-electronics.com" + req.originalUrl);
  }
  next();
});

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",").map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/products", productRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/secret", secretPanelRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: "خطأ في الخادم" });
});
