import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";
import budgetRoutes from "./src/routes/budgetRoutes.js";

dotenv.config();
const app = express();

const defaultAllowed = [
  "http://localhost:5173",
  "https://budgetbot.pages.dev",
];

const envAllowed = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : []),
].filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowed, ...envAllowed])];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman/curl
    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.log("❌ Blocked by CORS:", origin);
    return callback(new Error(`CORS blocked: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ IMPORTANT: don’t use "*" here (it can crash). Use a regex instead:
app.options(/.*/, cors(corsOptions));

app.use(express.json());
connectDB();

app.get("/", (req, res) => {
  res.send("BudgetBot backend is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));