import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";
import budgetRoutes from "./src/routes/budgetRoutes.js";

dotenv.config();
const app = express();

// ✅ Allow your frontends (add more if needed)
const allowedOrigins = [
  "http://localhost:5173",
  "https://budgetbot.pages.dev",
];

const corsOptions = {
  origin: (origin, cb) => {
    // allow Postman/curl (no origin)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);

    return cb(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ CORS middleware
app.use(cors(corsOptions));

// ✅ IMPORTANT: preflight (Express v5 safe)
app.options(/.*/, cors(corsOptions));

app.use(express.json());
connectDB();

app.get("/", (req, res) => {
  res.send("BudgetBot backend is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);

// ✅ Render needs process.env.PORT
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));