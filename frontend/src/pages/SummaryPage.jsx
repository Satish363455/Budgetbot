import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function formatUSD(n) {
  const num = Number(n || 0);
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toDateLabel(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Card({ title, value, sub, tone = "neutral" }) {
  const toneStyle =
    tone === "good"
      ? { color: "rgba(81,207,102,0.95)" }
      : tone === "bad"
      ? { color: "rgba(255,107,107,0.95)" }
      : tone === "warn"
      ? { color: "rgba(255,199,89,0.95)" }
      : {};

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        minWidth: 180,
        flex: "1 1 220px",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, ...toneStyle }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

export default function SummaryPage() {
  const { transactions = [], budgets = [], monthLabel = "" } =
    useOutletContext() || {};

  const computed = useMemo(() => {
    let income = 0;
    let expense = 0;

    const expenseByCategory = new Map();
    let biggestExpense = null;

    for (const t of transactions) {
      const amt = Number(t.amount || 0);
      const type = (t.type || "").toLowerCase();

      if (type === "income") income += amt;

      if (type === "expense") {
        expense += amt;

        const cat = String(t.category || "Other").trim() || "Other";
        expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + amt);

        if (!biggestExpense || amt > biggestExpense.amount) {
          biggestExpense = {
            category: cat,
            amount: amt,
            date: t.date || t.createdAt,
          };
        }
      }
    }

    // top category
    let topCategory = null;
    for (const [cat, amt] of expenseByCategory.entries()) {
      if (!topCategory || amt > topCategory.amount) {
        topCategory = { category: cat, amount: amt };
      }
    }

    // largest 5 expenses list
    const largestExpenses = [...transactions]
      .filter((t) => (t.type || "").toLowerCase() === "expense")
      .map((t) => ({
        _id: t._id,
        category: String(t.category || "Other").trim() || "Other",
        amount: Number(t.amount || 0),
        date: t.date || t.createdAt,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // ✅ Daily Activity (last 14 days) - EXPENSES only
    const dayMap = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), {
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        expense: 0,
      });
    }

    for (const t of transactions) {
      if ((t.type || "").toLowerCase() !== "expense") continue;
      const dt = new Date(t.date || t.createdAt || Date.now());
      if (Number.isNaN(dt.getTime())) continue;
      dt.setHours(0, 0, 0, 0);

      const key = dt.toISOString().slice(0, 10);
      const row = dayMap.get(key);
      if (!row) continue;

      row.expense += Number(t.amount || 0);
    }

    const dailyExpense = Array.from(dayMap.values());
    const last14Total = dailyExpense.reduce((s, r) => s + r.expense, 0);
    const last14Avg = last14Total / 14;

    return {
      income,
      expense,
      balance: income - expense,
      topCategory,
      biggestExpense,
      savingsRate: income ? ((income - expense) / income) * 100 : 0,
      largestExpenses,
      dailyExpense,
      last14Total,
      last14Avg,
    };
  }, [transactions, budgets]);

  if (transactions.length === 0) {
    return (
      <div style={{ padding: 24, opacity: 0.75 }}>
        <h2>Summary</h2>
        <p>No transactions yet.</p>
        <p>Add your first transaction to see insights.</p>
      </div>
    );
  }

  const incomePct =
    computed.income > 0 ? Math.min(100, (computed.income / computed.income) * 100) : 0;
  const expensePct =
    computed.income > 0 ? Math.min(100, (computed.expense / computed.income) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: 18, padding: 12 }}>
      <h2>
        Summary{" "}
        {monthLabel && <span style={{ opacity: 0.7 }}>({monthLabel})</span>}
      </h2>

      {/* Top cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Card title="Total Income" value={formatUSD(computed.income)} tone="good" />
        <Card title="Total Expense" value={formatUSD(computed.expense)} tone="bad" />
        <Card
          title="Net Flow"
          value={formatUSD(computed.balance)}
          tone={computed.balance >= 0 ? "good" : "bad"}
          sub={`Savings rate: ${Math.round(computed.savingsRate)}%`}
        />
      </div>

      {/* Net Flow Breakdown */}
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Net Flow Breakdown</h3>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Income vs Expense</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Income</div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${incomePct}%`,
                background: "rgba(81,207,102,0.85)",
              }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            {formatUSD(computed.income)}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Expense</div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${expensePct}%`,
                background: "rgba(255,107,107,0.85)",
              }}
            />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            {formatUSD(computed.expense)}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <b>Top category:</b>{" "}
          {computed.topCategory
            ? `${computed.topCategory.category} — ${formatUSD(computed.topCategory.amount)}`
            : "—"}
        </div>

        <div>
          <b>Biggest expense:</b>{" "}
          {computed.biggestExpense
            ? `${computed.biggestExpense.category} — ${formatUSD(
                computed.biggestExpense.amount
              )} (${toDateLabel(computed.biggestExpense.date)})`
            : "—"}
        </div>
      </div>

      {/* ✅ REPLACEMENT: Daily Activity (instead of Budget Warnings) */}
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Daily Activity</h3>
          <div style={{ fontSize: 12, opacity: 0.7 }}>last 14 days</div>
        </div>

        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          Total: <b>{formatUSD(computed.last14Total)}</b> · Avg/day:{" "}
          <b>{formatUSD(computed.last14Avg)}</b>
        </div>

        <div style={{ width: "100%", height: 220, marginTop: 12 }}>
          <ResponsiveContainer>
            <LineChart data={computed.dailyExpense} margin={{ left: 6, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatUSD(v)} />
              <Line
                type="monotone"
                dataKey="expense"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
          Spending pattern by day (expenses only).
        </div>
      </div>

      {/* Largest Expenses */}
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Largest Expenses</h3>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: -6 }}>
          Top 5 expense transactions
        </div>

        {computed.largestExpenses.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            No expenses yet.
          </p>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {computed.largestExpenses.map((x, idx) => (
              <div
                key={x._id || idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {idx + 1}. {x.category}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {toDateLabel(x.date)}
                  </div>
                </div>
                <div style={{ fontWeight: 900, color: "rgba(255,107,107,0.95)" }}>
                  -{formatUSD(x.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}