import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../api/axios";

const CATEGORY_RULES = [
  // Food
  { match: ["restaurant", "restaurants", "dining", "eat", "eating", "food", "groceries", "grocery", "cafe", "coffee"], to: "Food" },

  // Travel
  { match: ["gas", "fuel", "petrol", "diesel", "uber", "ola", "taxi", "cab", "bus", "train", "flight", "tickets", "travel", "transport"], to: "Travel" },

  // Rent / Housing
  { match: ["rent", "lease", "housing", "apartment", "mortgage"], to: "Rent" },

  // Utilities
  { match: ["utility", "utilities", "electric", "electricity", "water", "internet", "wifi", "phone", "mobile", "bill", "bills"], to: "Utilities" },

  // Shopping
  { match: ["shopping", "amazon", "flipkart", "clothes", "clothing", "fashion", "mall"], to: "Shopping" },

  // Health
  { match: ["health", "hospital", "doctor", "medicine", "pharmacy", "medical"], to: "Health" },

  // Entertainment
  { match: ["movie", "movies", "netflix", "spotify", "entertainment", "games", "game"], to: "Entertainment" },
];

const MAIN_CATEGORIES = [
  "Food",
  "Travel",
  "Rent",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

function normalizeCategory(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "Other";

  for (const rule of CATEGORY_RULES) {
    for (const token of rule.match) {
      if (s.includes(token)) return rule.to;
    }
  }
  return "Other";
}

const formatUSD = (n) =>
  `$${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BudgetsPage() {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [selectedCategory, setSelectedCategory] = useState("Food");
  const [limit, setLimit] = useState("");

  // Current month/year
  const now = useMemo(() => new Date(), []);
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  const startOfMonth = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const endOfMonth = useMemo(
    () => new Date(year, month, 0, 23, 59, 59, 999),
    [year, month]
  );

  const fetchTransactions = async () => {
    const params = {
      type: "expense",
      from: startOfMonth.toISOString(),
      to: endOfMonth.toISOString(),
    };
    const res = await axiosInstance.get("/transactions", { params });
    setTransactions(res.data || []);
  };

  const fetchBudgets = async () => {
    const res = await axiosInstance.get("/budgets", { params: { month, year } });
    setBudgets(res.data || []);
  };

  const refreshAll = async () => {
    setError("");
    setLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchBudgets()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load budgets data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spent per MAIN category
  const spentByMainCategory = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      const main = normalizeCategory(t?.category);
      map[main] = (map[main] || 0) + Number(t?.amount || 0);
    }
    return map;
  }, [transactions]);

  // Budget limit per MAIN category
  const limitByMainCategory = useMemo(() => {
    const map = {};
    for (const b of budgets) {
      const main = MAIN_CATEGORIES.includes(b?.category)
        ? b.category
        : normalizeCategory(b?.category);
      map[main] = { _id: b._id, limit: Number(b.limit || 0) };
    }
    return map;
  }, [budgets]);

  // Rows (MAIN categories only)
  const rows = useMemo(() => {
    return MAIN_CATEGORIES.map((cat) => {
      const spent = Number(spentByMainCategory[cat] || 0);
      const entry = limitByMainCategory[cat];
      const lim = entry ? Number(entry.limit || 0) : 0;

      let status = "no_limit";
      let percent = 0;
      if (lim > 0) {
        percent = (spent / lim) * 100;
        if (percent > 100) status = "over";
        else if (percent >= 80) status = "near";
        else status = "ok";
      }

      return {
        category: cat,
        spent,
        limit: lim,
        budgetId: entry?._id || null,
        percent,
        status,
      };
    });
  }, [spentByMainCategory, limitByMainCategory]);

  const handleSaveLimit = async (e) => {
    e.preventDefault();
    setError("");

    const lim = Number(limit);
    if (!selectedCategory) return setError("Please select a category");
    if (!lim || lim <= 0) return setError("Please enter a valid limit (> 0)");

    try {
      await axiosInstance.post("/budgets", {
        category: selectedCategory,
        limit: lim,
        month,
        year,
      });

      setLimit("");
      await fetchBudgets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save limit");
    }
  };

  const handleDeleteLimit = async (budgetId) => {
    setError("");
    try {
      await axiosInstance.delete(`/budgets/${budgetId}`);
      await fetchBudgets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete limit");
    }
  };

  const statusColor = (status) => {
    if (status === "over") return "#ff6b6b";
    if (status === "near") return "#ffc759";
    if (status === "ok") return "#51cf66";
    return "rgba(255,255,255,0.7)";
  };

  const statusLabel = (status) => {
    if (status === "over") return "❌ Over budget";
    if (status === "near") return "⚠️ Near limit";
    if (status === "ok") return "✅ Within limit";
    return "ℹ️ No limit set";
  };

  // ✅ ONLY SHOW ALREADY FIXED (limit > 0)
  const fixedRows = useMemo(() => rows.filter((r) => r.limit > 0), [rows]);

  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <h2 className="h2" style={{ marginTop: 0 }}>Budgets</h2>
      <div className="muted" style={{ marginBottom: 10 }}>
        Month: <b>{month}/{year}</b>
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p style={{ color: "#ff6b6b" }}>{error}</p> : null}

      {/* Set Budget Limit (still available at top) */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Set Budget Limit</h3>

        <form onSubmit={handleSaveLimit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            className="select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {MAIN_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            className="input"
            placeholder="Enter limit ($)"
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />

          <button className="btn" type="submit">Save Limit</button>
        </form>
      </div>

      {/* ✅ Category Limits (ONLY FIXED) */}
      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Category Limits</h3>

        {fixedRows.length === 0 ? (
          <p className="muted">No limits set yet. Add a limit above.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {fixedRows.map((r) => (
              <div
                key={r.category}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{r.category}</div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    Limit: {formatUSD(r.limit)} · Spent: {formatUSD(r.spent)}
                  </div>
                </div>

                {/* ✅ only Delete (no Set button anymore) */}
                <button
                  className="btn"
                  type="button"
                  onClick={() => handleDeleteLimit(r.budgetId)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget Warnings (ONLY FIXED) */}
      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Budget Warnings</h3>

        {fixedRows.length === 0 ? (
          <p className="muted">No limits set yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {fixedRows.map((r) => (
              <div
                key={r.category}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div style={{ fontWeight: 900, color: statusColor(r.status) }}>
                  {statusLabel(r.status)} — {r.category}
                </div>

                <div className="muted" style={{ marginTop: 6 }}>
                  Spent: {formatUSD(r.spent)} / Limit: {formatUSD(r.limit)}
                  {r.limit > 0 ? ` (${Math.round(r.percent)}%)` : ""}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.10)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, r.percent)}%`,
                      background:
                        r.status === "over"
                          ? "rgba(255,107,107,0.85)"
                          : r.status === "near"
                          ? "rgba(255,199,89,0.85)"
                          : "rgba(81,207,102,0.85)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}