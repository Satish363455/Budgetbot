import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const PIE_COLORS = ["#8dd3c7","#80b1d3","#fdb462","#b3de69","#fb8072","#bebada"];

const formatUSD = (n) =>
  `$${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** ✅ Same grouping rules as Transactions page */
const CATEGORY_GROUPS = {
  Food: [
    "food","restaurant","dining","groceries","grocery","coffee","snacks","swiggy","zomato",
  ],
  Travel: [
    "gas","fuel","petrol","diesel","uber","ola","lyft","taxi","train","bus","flight","tickets","parking","toll",
  ],
  Rent: ["rent","lease","house rent"],
  Utilities: ["electric","electricity","water","wifi","internet","phone","gas bill"],
  Shopping: ["shopping","amazon","flipkart","clothes","electronics","mall"],
  Entertainment: ["movie","netflix","spotify","games","party","outing"],
  Health: ["doctor","medicine","hospital","pharmacy","gym"],
  Education: ["course","udemy","books","college","fees"],
  Savings: ["savings","investment","sip","stocks"],
};

const norm = (s) => String(s || "").trim().toLowerCase();

function getGroup(category) {
  const c = norm(category);
  for (const [group, keys] of Object.entries(CATEGORY_GROUPS)) {
    if (keys.some((k) => c === norm(k) || c.includes(norm(k)))) return group;
  }
  return "Other";
}

function monthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default function ChartsPage() {
  const {
    transactions = [],
    budgets = [],
    month = 0,
    year = new Date().getFullYear(),
  } = useOutletContext() || {};

  /** ✅ 1) Expenses by GROUP (Pie) */
  const expensesByCategory = useMemo(() => {
    const map = new Map();

    for (const t of transactions) {
      if ((t.type || "").toLowerCase() !== "expense") continue;

      const original = String(t.category || "Other").trim() || "Other";
      const group = getGroup(original);           // ✅ group here
      const amt = Number(t.amount || 0);

      map.set(group, (map.get(group) || 0) + amt);
    }

    const data = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    data.sort((a, b) => b.value - a.value);
    return data;
  }, [transactions]);

  /** 2) Income vs Expense (last 6 months) */
  const incomeExpenseLast6 = useMemo(() => {
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      buckets.push({
        y: d.getFullYear(),
        m: d.getMonth(),
        label: d.toLocaleString("en-US", { month: "short" }) + " " + d.getFullYear(),
        income: 0,
        expense: 0,
      });
    }

    const bucketMap = new Map();
    for (const b of buckets) bucketMap.set(monthKey(b.y, b.m), b);

    for (const t of transactions) {
      const dt = new Date(t.date || t.createdAt || Date.now());
      if (Number.isNaN(dt.getTime())) continue;

      const key = monthKey(dt.getFullYear(), dt.getMonth());
      const bucket = bucketMap.get(key);
      if (!bucket) continue;

      const amt = Number(t.amount || 0);
      const type = (t.type || "").toLowerCase();
      if (type === "income") bucket.income += amt;
      if (type === "expense") bucket.expense += amt;
    }

    return buckets.map(({ label, income, expense }) => ({
      month: label,
      Income: income,
      Expense: expense,
    }));
  }, [transactions, month, year]);

  /** ✅ 3) Budget Progress (grouped budgets too) */
  const budgetProgress = useMemo(() => {
    const spentMap = new Map();

    for (const t of transactions) {
      if ((t.type || "").toLowerCase() !== "expense") continue;
      const group = getGroup(t.category);
      const amt = Number(t.amount || 0);
      spentMap.set(group, (spentMap.get(group) || 0) + amt);
    }

    // budgets: if your budget categories are raw (Food/Gas/Restaurant)
    // this will group them too.
    const limitMap = new Map();
    for (const b of Array.isArray(budgets) ? budgets : []) {
      const group = getGroup(b.category);
      const limit = Number(b.limit ?? b.amount ?? 0);
      limitMap.set(group, (limitMap.get(group) || 0) + limit);
    }

    const rows = Array.from(limitMap.entries())
      .map(([category, limit]) => {
        const spent = Number(spentMap.get(category) || 0);
        const pct = limit > 0 ? (spent / limit) * 100 : 0;

        let status = "Safe";
        if (pct >= 100) status = "Exceeded";
        else if (pct >= 80) status = "Warning";

        return { category, limit, spent, pct, status };
      })
      .filter((r) => r.limit > 0);

    const order = { Exceeded: 0, Warning: 1, Safe: 2 };
    rows.sort((a, b) => order[a.status] - order[b.status] || b.pct - a.pct);

    return rows;
  }, [transactions, budgets]);

  return (
    <div className="card" style={{ display: "grid", gap: 18 }}>
      <h2 className="h2">Charts</h2>

      {/* Pie */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Expenses by Category (Grouped)</h3>
        {expensesByCategory.length === 0 ? (
          <p className="muted">No expenses yet.</p>
        ) : (
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, value }) => `${name}: ${formatUSD(value)}`}
                >
                  {expensesByCategory.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatUSD(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Income vs Expense */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Income vs Expense (Last 6 Months)</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={incomeExpenseLast6}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatUSD(v)} />
              <Legend />
              <Bar dataKey="Income" fill="#7bd88f" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Expense" fill="#ff6b6b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Budget Progress (This Month) — Grouped</h3>

        {budgetProgress.length === 0 ? (
          <p className="muted">Add budgets to see progress bars.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {budgetProgress.map((r) => (
              <div
                key={r.category}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>{r.category}</div>
                  <div className="muted">
                    {formatUSD(r.spent)} / {formatUSD(r.limit)} • {Math.round(r.pct)}% •{" "}
                    <b>
                      {r.status === "Exceeded" ? "🚨 Exceeded" : r.status === "Warning" ? "⚠️ Warning" : "✅ Safe"}
                    </b>
                  </div>
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
                      width: `${Math.min(100, r.pct)}%`,
                      background:
                        r.status === "Exceeded"
                          ? "rgba(255,107,107,0.85)"
                          : r.status === "Warning"
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