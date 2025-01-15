import React, { useState, useEffect, useCallback, useRef } from "react";
import { formatCurrency } from "../utils/format";
import { supabase } from "../config/supabase";
import { useAuth } from "../context/AuthContext";
import { logger } from "../utils/logger";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";

// Chart.js + react-chartjs-2
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

// ----- Interfaces -----
interface Transaction {
  id: string;
  description: string;
  amount: number;
  budgetId: string; // which custom budget it belongs to
  color: string;    // color copied from that budget
}

interface CustomBudget {
  id: string;
  name: string;
  amount: number;
  color: string;
}

interface BalanceHistoryPoint {
  date: string; // ISO date
  cash: number;
  stocks: number;
  total: number;
}

export default function Budgeting() {
  const { user } = useAuth();

  // For demo, set dark mode manually (replace with your theme store if available)
  const [isDarkMode] = useState(false);

  // ----- Basic Budget State -----
  const [monthlyBudget, setMonthlyBudget] = useState(1000);
  const [rolloverAmount, setRolloverAmount] = useState(0);

  // ---------------------------------------
  // Transactions
  // ---------------------------------------
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: 0,
    budgetId: ''
  });

  // For editing transactions inline
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editedTransaction, setEditedTransaction] = useState<Transaction | null>(null);

  // ----- Custom Budgets -----
  const [customBudgets, setCustomBudgets] = useState<CustomBudget[]>([]);
  const [newCustomBudget, setNewCustomBudget] = useState({
    name: "",
    amount: 0,
    color: "#00bfff"
  });

  // ----- Balances -----
  const [cashBalance, setCashBalance] = useState(0);
  const [stocksBalance, setStocksBalance] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  // ----- Balance History (for chart) -----
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistoryPoint[]>([]);
  const oldTotalRef = useRef<number | null>(null);

  // ----- Global Progress -----
  const [progress, setProgress] = useState(100);

  // ----- Supabase Loading/Error -----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----- Fetch from Supabase -----
  const fetchBudget = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      logger.info("Fetching budget data for user:", user.id);

      // Use .single() so that we get one row (create one if not exists via a separate process)
      const { data, error } = await supabase
        .from("user_budgets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      logger.info("Fetched budget data:", data);

      if (data) {
        setMonthlyBudget(data.monthly_budget ?? 1000);
        setRolloverAmount(data.rollover_amount ?? 0);
        setTransactions(data.transactions ? JSON.parse(JSON.stringify(data.transactions)) : []);
        setCashBalance(Number(data.cash_balance ?? 0));
        setStocksBalance(Number(data.stocks_balance ?? 0));
        setTotalBalance(Number(data.total_balance ?? 0));
        setBalanceHistory(
          data.balance_history ? JSON.parse(JSON.stringify(data.balance_history)) : []
        );
        setCustomBudgets(
          data.custom_budgets ? JSON.parse(JSON.stringify(data.custom_budgets)) : []
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load budget data";
      setError(message);
      logger.error("Error fetching budget data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

// ---------------------------------------
// Save data to Supabase (Combined)
// ---------------------------------------
const saveBudget = useCallback(
  async (
    overrideTransactions?: Transaction[],
    overrideBudgets?: CustomBudget[]
  ) => {
    if (!user) return;

    const finalTransactions = overrideTransactions ?? transactions;
    const finalBudgets = overrideBudgets ?? customBudgets;

    try {
      setError(null);
      logger.info("Saving budget data:", {
        monthlyBudget,
        rolloverAmount,
        transactions: finalTransactions,
        customBudgets: finalBudgets,
        cashBalance,
        stocksBalance,
        totalBalance,
        balanceHistory,
      });

      await supabase
        .from("user_budgets")
        .upsert(
          {
            user_id: user.id,
            monthly_budget: monthlyBudget,
            rollover_amount: rolloverAmount,
            transactions: finalTransactions,
            custom_budgets: finalBudgets,
            cash_balance: cashBalance,
            stocks_balance: stocksBalance,
            total_balance: totalBalance,
            balance_history: balanceHistory,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save budget data";
      setError(message);
      logger.error("Error saving budget data:", err);
    }
  },
  [
    user,
    monthlyBudget,
    rolloverAmount,
    transactions,
    customBudgets,
    cashBalance,
    stocksBalance,
    totalBalance,
    balanceHistory,
  ]
);


  // ----- On Mount: Fetch data -----
  useEffect(() => {
    if (user) {
      logger.info("useEffect fetchBudget running for user:", user.id);
      fetchBudget();
    }
  }, [user, fetchBudget]);

  // ----- Global Progress Calculation -----
  useEffect(() => {
    const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const remaining = monthlyBudget + rolloverAmount - totalSpent;
    const newProgress = Math.max(0, Math.min(100, (remaining / (monthlyBudget + rolloverAmount)) * 100));
    setProgress(newProgress);
  }, [transactions, monthlyBudget, rolloverAmount]);

  // ----- Recalculate Total Balance & Update History (only when total changes) -----
  useEffect(() => {
    const newTotal = cashBalance + stocksBalance;
    setTotalBalance(newTotal);
    if (oldTotalRef.current !== null && oldTotalRef.current !== newTotal) {
      const newPoint: BalanceHistoryPoint = {
        date: new Date().toISOString(),
        cash: cashBalance,
        stocks: stocksBalance,
        total: newTotal
      };
      setBalanceHistory((prev) => [...prev, newPoint]);
      // Use a timeout to let state flush before saving
      setTimeout(() => saveBudget(), 0);
    }
    oldTotalRef.current = newTotal;
  }, [cashBalance, stocksBalance, saveBudget]);

  // ----- Debug Logging for Transactions -----
  useEffect(() => {
    logger.info("Transactions state before update:", transactions);
    return () => {
      logger.info("Transactions state after update:", transactions);
    };
  }, [transactions]);

  // ----- Add Transaction -----
  const handleAddTransaction = async () => {
    if (!newTransaction.description || newTransaction.amount === 0) return;
    let chosenColor: string | undefined;
    const budget = customBudgets.find((b) => b.id === newTransaction.budgetId);
    if (budget) chosenColor = budget.color;
    const tx: Transaction = {
      id: crypto.randomUUID(),
      description: newTransaction.description,
      amount: newTransaction.amount,
      budgetId: newTransaction.budgetId || "",
      color: chosenColor || "#888888"
    };
    const updatedTransactions = [...transactions, tx];
    setTransactions(updatedTransactions);
    setNewTransaction({ description: "", amount: 0, budgetId: "" });
    setTimeout(() => saveBudget(), 0);
  };

  // ----- Edit / Delete Transaction -----
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setEditedTransaction(transaction);
  };

  const handleSaveEditedTransaction = async () => {
    if (!editedTransaction) return;

    const updatedTransactions = transactions.map((tx) =>
      tx.id === editedTransaction.id ? editedTransaction : tx
    );
    setTransactions(updatedTransactions);

    setEditingTransactionId(null);
    setEditedTransaction(null);

    await saveBudget(updatedTransactions, customBudgets);
  };

  const handleCancelEdit = () => {
    setEditingTransactionId(null);
    setEditedTransaction(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    const updatedTransactions = transactions.filter((tx) => tx.id !== id);
    setTransactions(updatedTransactions);
    await saveBudget(updatedTransactions, customBudgets);
  };

  // ----- Add / Delete Custom Budget -----
  const handleAddCustomBudget = async () => {
    if (!newCustomBudget.name || newCustomBudget.amount <= 0) return;
    const newBudget: CustomBudget = {
      id: crypto.randomUUID(),
      name: newCustomBudget.name,
      amount: newCustomBudget.amount,
      color: newCustomBudget.color
    };
    const updatedBudgets = [...customBudgets, newBudget];
    setCustomBudgets(updatedBudgets);
    setNewCustomBudget({ name: "", amount: 0, color: "#00bfff" });
    setTimeout(() => saveBudget(), 0);
  };

  const handleDeleteCustomBudget = async (id: string) => {
    const updatedBudgets = customBudgets.filter((b) => b.id !== id);
    setCustomBudgets(updatedBudgets);
    setTimeout(() => saveBudget(), 0);
  };

  // ----- Chart Data (Multi-Line: Cash, Stocks, Total) -----
  const chartLabels = balanceHistory.map((p) => new Date(p.date).toLocaleString());
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Cash",
        data: balanceHistory.map((p) => p.cash),
        borderColor: "#10B981",
        backgroundColor: "#10B98133",
        fill: true,
        tension: 0.3
      },
      {
        label: "Stocks",
        data: balanceHistory.map((p) => p.stocks),
        borderColor: "#FBBF24",
        backgroundColor: "#FBBF2433",
        fill: true,
        tension: 0.3
      },
      {
        label: "Total",
        data: balanceHistory.map((p) => p.total),
        borderColor: "#7AC74F",
        backgroundColor: "#7AC74F33",
        fill: true,
        tension: 0.3
      }
    ]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: isDarkMode ? "#e5e7eb" : "#e5e7eb" },
        grid: { color: isDarkMode ? "#374151" : "#e5e7eb" }
      },
      y: {
        ticks: {
          color: isDarkMode ? "#e5e7eb" : "#e5e7eb",
          callback: (value: number | string) => {
            if (typeof value === "number") return formatCurrency(value);
            return value;
          }
        },
        grid: { color: isDarkMode ? "#374151" : "#e5e7eb" }
      }
    },
    plugins: {
      legend: { labels: { color: isDarkMode ? "#e5e7eb" : "#e5e7eb" } },
      tooltip: {
        callbacks: {
          label: (context: any) => formatCurrency(context.parsed.y || 0)
        }
      }
    }
  };

  // ----- Rendering -----
  if (loading) return <div>Loading...</div>;
  if (error)
    return (
      <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4">{error}</div>
    );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Matcha Wallet</h1>

      {/* GLOBAL BUDGET & ROLLOVER */}
      <div className="rounded-lg border bg-white text-black shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Total Monthly Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                onBlur={() => saveBudget()}
                className="pl-8 w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rollover Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={rolloverAmount}
                onChange={(e) => setRolloverAmount(Number(e.target.value))}
                onBlur={() => saveBudget()}
                className="pl-8 w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute h-full bg-emerald-500/20 transition-all duration-500"
            style={{ width: `${(rolloverAmount / (monthlyBudget + rolloverAmount)) * 100}%` }}
          />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white font-medium">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* BALANCES */}
      <div className="rounded-lg border bg-white text-black shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Your Balances</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Total Balance</label>
          <div className="text-4xl font-bold text-emerald-600 mb-2">{formatCurrency(totalBalance)}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Automatically sums <strong>Cash</strong> + <strong>Stocks &amp; Holdings</strong>
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cash Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={cashBalance}
                onChange={(e) => setCashBalance(Number(e.target.value))}
                className="pl-8 w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm text-green-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stocks &amp; Holdings</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={stocksBalance}
                onChange={(e) => setStocksBalance(Number(e.target.value))}
                className="pl-8 w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm text-yellow-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-LINE CHART */}
      <div className="rounded-lg border bg-white text-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Balance History</h2>
        <div className="h-64">
          {balanceHistory.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              No data points yet. Adjust balances above to begin tracking.
            </p>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* CUSTOM BUDGETS */}
      <div className="rounded-lg border bg-white text-black shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Custom Budgets</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Each budget has a name, total amount, and color. We track how much is spent in each
          from the Transactions below (if linked).
        </p>
        {/* Add Custom Budget Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Budget Name</label>
            <input
              type="text"
              value={newCustomBudget.name}
              onChange={(e) =>
                setNewCustomBudget({ ...newCustomBudget, name: e.target.value })
              }
              className="w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={newCustomBudget.amount}
              onChange={(e) =>
                setNewCustomBudget({ ...newCustomBudget, amount: Number(e.target.value) })
              }
              className="w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input
              type="color"
              value={newCustomBudget.color}
              onChange={(e) =>
                setNewCustomBudget({ ...newCustomBudget, color: e.target.value })
              }
              className="w-full h-10 cursor-pointer rounded-full border bg-white dark:bg-gray-700 appearance-none"
            />
          </div>
          <button
            onClick={handleAddCustomBudget}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mt-6"
          >
            <Plus className="mr-1" size={20} />
            Add Budget
          </button>
        </div>

        {customBudgets.length > 0 && (
          <div className="space-y-4">
            {customBudgets.map((b) => {
              const spent = transactions
                .filter((tx) => tx.budgetId === b.id)
                .reduce((sum, tx) => sum + tx.amount, 0);
              let usedPercent = 0;
              if (b.amount > 0) {
                usedPercent = (spent / b.amount) * 100;
                usedPercent = Math.min(100, Math.max(0, usedPercent));
              }
              return (
                <div
                  key={b.id}
                  className="p-3 rounded-md border dark:border-gray-600"
                  style={{ backgroundColor: b.color + "1A" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <strong>{b.name}</strong>{" "}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({formatCurrency(b.amount)})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomBudget(b.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                  <div
                    className="relative w-full h-4 rounded-full overflow-hidden"
                    style={{ backgroundColor: b.color + "33" }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${usedPercent}%`,
                        backgroundColor: b.color
                      }}
                    />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white font-medium">
                      {Math.round(usedPercent)}%
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Spent {formatCurrency(spent)} / {formatCurrency(b.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TRANSACTIONS */}
      <div className="rounded-lg border bg-white text-black shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">Add Transaction</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              className="w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={newTransaction.amount}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })
                }
                className="pl-8 w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm"
              />
            </div>
            <small className="text-gray-500 dark:text-gray-400">
              (Use <strong>negative</strong> for credits)
            </small>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Budget</label>
            <select
              value={newTransaction.budgetId}
              onChange={(e) => setNewTransaction({ ...newTransaction, budgetId: e.target.value })}
              className="w-full rounded-md border bg-white dark:bg-gray-700 py-2 text-sm"
            >
              <option value="">-- None --</option>
              {customBudgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddTransaction}
            className="flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors mt-6 px-4 py-2"
          >
            <Plus className="mr-1" size={20} />
            Add
          </button>
        </div>

        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400">
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Budget</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b dark:border-gray-700">
                  <td className="py-2 pr-4">
                    {editingTransactionId === tx.id ? (
                      <input
                        type="text"
                        value={editedTransaction?.description || ""}
                        onChange={(e) =>
                          setEditedTransaction((prev) =>
                            prev ? { ...prev, description: e.target.value } : null
                          )
                        }
                        className="w-full rounded-md border bg-white dark:bg-gray-700 py-1 text-sm"
                      />
                    ) : (
                      tx.description
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingTransactionId === tx.id ? (
                      <input
                        type="number"
                        value={editedTransaction?.amount || 0}
                        onChange={(e) =>
                          setEditedTransaction((prev) =>
                            prev ? { ...prev, amount: Number(e.target.value) } : null
                          )
                        }
                        className="w-full rounded-md border bg-white dark:bg-gray-700 py-1 text-sm"
                      />
                    ) : (
                      formatCurrency(tx.amount)
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-1">
                      {tx.color && (
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: tx.color }}
                        />
                      )}
                      {customBudgets.find((b) => b.id === tx.budgetId)?.name || ""}
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    {editingTransactionId === tx.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEditedTransaction}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTransaction(tx)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
