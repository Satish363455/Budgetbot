import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";
import budgetRoutes from "./src/routes/budgetRoutes.js";

dotenv.config();
const app = express();

// ✅ Replace ONLY this CORS block
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL, // set this on Render to your Cloudflare/Vercel URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (Postman/curl)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`));
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);