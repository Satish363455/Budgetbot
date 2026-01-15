import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";
import budgetRoutes from "./src/routes/budgetRoutes.js";

dotenv.config();
const app = express();

// ✅ allow local dev + your Cloudflare frontend
const allowedOrigins = [
  "http://localhost:5173",
  "https://budgetbot.pages.dev",
  "https://budgetbot.pages.dev/",
  // If you use a preview URL sometimes, you can add it here too:
  // "https://<your-project>.pages.dev",
];

app.use(
  cors({
    origin: function (origin, cb) {
      // allow requests with no origin (like Postman)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json());
connectDB();

app.get("/", (req, res) => {
  res.send("BudgetBot backend is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);

// ✅ Render requires process.env.PORT
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));