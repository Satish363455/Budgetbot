import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axiosInstance from "../api/axios";

function toDateInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const formatUSD = (n) =>
  `$${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/** ✅ 1) Category Group Rules (edit these any time) */
const CATEGORY_GROUPS = {
  Food: [
    "food",
    "restaurant",
    "dining",
    "groceries",
    "grocery",
    "coffee",
    "snacks",
    "swiggy",
    "zomato",
  ],
  Travel: [
    "gas",
    "fuel",
    "petrol",
    "diesel",
    "uber",
    "ola",
    "lyft",
    "taxi",
    "train",
    "bus",
    "flight",
    "tickets",
    "parking",
    "toll",
  ],
  Rent: ["rent", "lease", "house rent"],
  Utilities: ["electric", "electricity", "water", "wifi", "internet", "phone", "gas bill"],
  Shopping: ["shopping", "amazon", "flipkart", "clothes", "electronics", "mall"],
  Entertainment: ["movie", "netflix", "spotify", "games", "party", "outing"],
  Health: ["doctor", "medicine", "hospital", "pharmacy", "gym"],
  Education: ["course", "udemy", "books", "college", "fees"],
  Savings: ["savings", "investment", "sip", "stocks"],
};

const norm = (s) => String(s || "").trim().toLowerCase();

function getGroup(category) {
  const c = norm(category);
  for (const [group, keys] of Object.entries(CATEGORY_GROUPS)) {
    if (keys.some((k) => c === norm(k) || c.includes(norm(k)))) return group;
  }
  return "Other";
}

export default function TransactionsPage() {
  const { transactions = [], fetchTransactions, month, year } =
    useOutletContext() || {};

  // Add form
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toDateInputValue(new Date()));

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  // UX
  const [loading, setLoading] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState(null);
  const [editType, setEditType] = useState("expense");
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState(toDateInputValue(new Date()));

  useEffect(() => {
    fetchTransactions?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthLabel = useMemo(() => {
    const names = [
      "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
    ];
    return `${names[month] ?? ""} ${year ?? ""}`.trim();
  }, [month, year]);

  function openDate(t) {
    return t?.date || t?.createdAt || Date.now();
  }

  /** ✅ add UI-only fields: group + original category */
  const uiTransactions = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    return list.map((t) => {
      const original = String(t.category || "").trim();
      const group = getGroup(original);
      return {
        ...t,
        __original: original || "—",
        __group: group,
      };
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let list = uiTransactions;

    if (filterType !== "all") list = list.filter((t) => t.type === filterType);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const original = norm(t.__original);
        const group = norm(t.__group);
        return original.includes(q) || group.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      const da = new Date(openDate(a)).getTime();
      const db = new Date(openDate(b)).getTime();
      return db - da;
    });
  }, [uiTransactions, filterType, search]);

  const addTransaction = async () => {
    const amt = Number(amount);

    if (!category.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter valid category and amount");
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post("/transactions", {
        type,
        category: category.trim(), // ✅ keep original in DB
        amount: amt,
        date: new Date(date).toISOString(),
      });

      setCategory("");
      setAmount("");
      setDate(toDateInputValue(new Date()));

      toast.success("Transaction added");
      await fetchTransactions?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (t) => {
    setEditing(t);
    setEditType(t.type || "expense");
    setEditCategory(t.__original || t.category || "");
    setEditAmount(String(t.amount ?? ""));
    setEditDate(toDateInputValue(new Date(openDate(t))));
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing?._id) return;

    const amt = Number(editAmount);
    if (!editCategory.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter valid category and amount");
      return;
    }

    try {
      setLoading(true);

      await axiosInstance.put(`/transactions/${editing._id}`, {
        type: editType,
        category: editCategory.trim(), // ✅ keep original in DB
        amount: amt,
        date: new Date(editDate).toISOString(),
      });

      toast.success("Transaction updated");
      closeEdit();
      await fetchTransactions?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  const deleteTx = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      setLoading(true);
      await axiosInstance.delete(`/transactions/${id}`);
      toast.success("Transaction deleted");
      await fetchTransactions?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 className="h2" style={{ marginBottom: 6 }}>
            Transactions
          </h2>
          <div className="muted">
            Viewing: <b>{monthLabel}</b>
          </div>
        </div>
      </div>

      {/* Add form */}
      <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: "wrap" }}>
        <select
          className="select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <input
          className="input"
          placeholder="Category (ex: Restaurant, Gas, Groceries...)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          className="input"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <button className="btn" onClick={addTransaction} disabled={loading}>
          {loading ? "Working…" : "Add"}
        </button>
      </div>

      {/* Filters */}
      <div className="row" style={{ marginTop: 14, gap: 10, flexWrap: "wrap" }}>
        <select
          className="select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <input
          className="input"
          placeholder="Search group or category… (Food / Gas / Restaurant)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="muted">
          Showing <b>{filteredTransactions.length}</b> transactions
        </div>
      </div>

      {/* ✅ Professional Card List (same template, but grouped) */}
      {filteredTransactions.length ? (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {filteredTransactions.map((t, i) => (
            <div
              key={t._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {/* LEFT */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {i + 1}
                </div>

                <div>
                  {/* ✅ show Group + original */}
                  <div style={{ fontWeight: 900 }}>
                    {t.__group}{" "}
                    <span style={{ fontWeight: 700, opacity: 0.75 }}>
                      — {t.__original}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        background:
                          t.type === "income"
                            ? "rgba(81,207,102,0.15)"
                            : "rgba(255,107,107,0.15)",
                        marginRight: 8,
                        textTransform: "capitalize",
                      }}
                    >
                      {t.type}
                    </span>
                    {formatDate(openDate(t))}
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontWeight: 900,
                    color: t.type === "income" ? "#51cf66" : "#ff6b6b",
                  }}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatUSD(t.amount)}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  <button className="btn" onClick={() => openEdit(t)}>
                    Edit
                  </button>
                  <button className="btn" onClick={() => deleteTx(t._id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 14 }}>
          No transactions for this month.
        </p>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          onClick={closeEdit}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 999999,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(640px, 95vw)", padding: 16 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <h2 className="h2" style={{ margin: 0 }}>
                Edit Transaction
              </h2>
              <button className="btn" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <select
                className="select"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <input
                className="input"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="Category"
              />

              <input
                className="input"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="Amount"
              />

              <input
                className="input"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            {/* ✅ optional: show the group preview */}
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Will display as: <b>{getGroup(editCategory)}</b> —{" "}
              {editCategory || "—"}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button className="btn" onClick={closeEdit}>
                Cancel
              </button>
              <button className="btn" onClick={saveEdit} disabled={loading}>
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}