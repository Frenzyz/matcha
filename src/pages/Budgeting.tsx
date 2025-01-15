import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency } from '../utils/format';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

// Each transaction can reference a budgetId and store the budget's color.
interface Transaction {
  id: string;
  description: string;
  amount: number;   // can be negative or positive
  budgetId: string; // which custom budget it belongs to
  color: string;    // color copied from that budget
}

interface CustomBudget {
  id: string;
  name: string;
  amount: number;
  color: string;
}

export default function Budgeting() {
  const { user } = useAuth();

  // ---------------------------------------
  // Global monthly budget + rollover
  // ---------------------------------------
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

  // ---------------------------------------
  // Custom Budgets
  // ---------------------------------------
  const [customBudgets, setCustomBudgets] = useState<CustomBudget[]>([]);
  const [newCustomBudget, setNewCustomBudget] = useState({
    name: '',
    amount: 0,
    color: '#00bfff'
  });

  // ---------------------------------------
  // UI/State
  // ---------------------------------------
  const [progress, setProgress] = useState(100); // global bar
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // ---------------------------------------
  // Fetch data from Supabase
  // ---------------------------------------
  const fetchBudget = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      logger.info('Fetching budget data for user:', user.id);

      const { data, error } = await supabase
        .from('user_budgets')
        .select('monthly_budget, rollover_amount, transactions, custom_budgets')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      logger.info('Fetched budget data:', data);

      if (data) {
        setMonthlyBudget(data.monthly_budget ?? 1000);
        setRolloverAmount(data.rollover_amount ?? 0);

        // Safely parse the transactions
        const txArray = data.transactions ? JSON.parse(JSON.stringify(data.transactions)) : [];
        setTransactions(txArray);

        // Safely parse the custom budgets
        const cbArray = data.custom_budgets ? JSON.parse(JSON.stringify(data.custom_budgets)) : [];
        setCustomBudgets(cbArray);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load budget data';
      setError(message);
      logger.error('Error fetching budget data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ---------------------------------------
  // Save data to Supabase
  // ---------------------------------------
  const saveBudget = useCallback(
    async (overrideTransactions?: Transaction[], overrideBudgets?: CustomBudget[]) => {
      if (!user) return;

      const finalTransactions = overrideTransactions ?? transactions;
      const finalBudgets = overrideBudgets ?? customBudgets;

      try {
        setError(null);
        logger.info('Saving budget data:', {
          monthlyBudget,
          rolloverAmount,
          transactions: finalTransactions,
          customBudgets: finalBudgets
        });

        await supabase
          .from('user_budgets')
          .upsert(
            {
              user_id: user.id,
              monthly_budget: monthlyBudget,
              rollover_amount: rolloverAmount,
              transactions: finalTransactions,
              custom_budgets: finalBudgets,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save budget data';
        setError(message);
        logger.error('Error saving budget data:', err);
      }
    },
    [user, monthlyBudget, rolloverAmount, transactions, customBudgets]
  );

  // ---------------------------------------
  // useEffects
  // ---------------------------------------
  useEffect(() => {
    if (user) {
      logger.info('useEffect fetchBudget running for user:', user.id);
      fetchBudget();
    }
  }, [user, fetchBudget]);

  useEffect(() => {
    calculateGlobalProgress();
  }, [monthlyBudget, rolloverAmount, transactions]);

  useEffect(() => {
    logger.info('Transactions state before update:', transactions);
    return () => {
      logger.info('Transactions state after update:', transactions);
    };
  }, [transactions]);

  // ---------------------------------------
  // Global progress bar
  // ---------------------------------------
  const calculateGlobalProgress = () => {
    const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const remaining = monthlyBudget + rolloverAmount - totalSpent;
    const newProgress = Math.max(0, Math.min(100, (remaining / (monthlyBudget + rolloverAmount)) * 100));
    setProgress(newProgress);
  };

  // ---------------------------------------
  // Transactions
  // ---------------------------------------
  const handleAddTransaction = async () => {
    if (!newTransaction.description || newTransaction.amount === 0) return;

    // Find chosen budget (if any) so we can copy its color
    const chosenBudget = customBudgets.find((b) => b.id === newTransaction.budgetId);

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      description: newTransaction.description,
      amount: newTransaction.amount,
      budgetId: newTransaction.budgetId,
      color: chosenBudget ? chosenBudget.color : '#888888'
    };

    const updatedTransactions = [...transactions, transaction];
    setTransactions(updatedTransactions);

    // Clear the form
    setNewTransaction({ description: '', amount: 0, budgetId: '' });

    await saveBudget(updatedTransactions, customBudgets);
  };

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

  // ---------------------------------------
  // Custom Budgets
  // ---------------------------------------
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

    // Reset form
    setNewCustomBudget({ name: '', amount: 0, color: '#00bfff' });

    await saveBudget(transactions, updatedBudgets);
  };

  const handleDeleteCustomBudget = async (id: string) => {
    // Optionally reassign or remove transactions with this budgetId. For now, we leave them as-is.
    const updatedBudgets = customBudgets.filter((b) => b.id !== id);
    setCustomBudgets(updatedBudgets);
    await saveBudget(transactions, updatedBudgets);
  };

  // ---------------------------------------
  // Render
  // ---------------------------------------
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Matcha Wallet</h1>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* GLOBAL BUDGET + ROLLOVER */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total Monthly Budget
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                onBlur={() => saveBudget()}
                className="pl-8 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rollover Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={rolloverAmount}
                onChange={(e) => setRolloverAmount(Number(e.target.value))}
                onBlur={() => saveBudget()}
                className="pl-8 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Global progress bar */}
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute h-full bg-emerald-500/20 transition-all duration-500"
            style={{
              width: `${
                (rolloverAmount / (monthlyBudget + rolloverAmount)) * 100
              }%`
            }}
          />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white font-medium">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* CUSTOM BUDGETS WITH INDIVIDUAL PROGRESS */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Custom Budgets</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Create categories, each with a color. Each budget has its own progress bar.
        </p>

        {/* Add custom budget form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Budget Name
            </label>
            <input
              type="text"
              value={newCustomBudget.name}
              onChange={(e) =>
                setNewCustomBudget({ ...newCustomBudget, name: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={newCustomBudget.amount}
              onChange={(e) =>
                setNewCustomBudget({ ...newCustomBudget, amount: Number(e.target.value) })
              }
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <input
              type="color"
              value={newCustomBudget.color}
              onChange={(e) =>
                setNewCustomBudget({ ...newCustomBudget, color: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 h-10"
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

        {/* List each custom budget + progress bar */}
        {customBudgets.length > 0 && (
          <div className="space-y-4">
            {customBudgets.map((budget) => {
              // 1) Calculate how much has been spent for this budget
              const spent = transactions
                .filter((tx) => tx.budgetId === budget.id)
                .reduce((sum, tx) => sum + tx.amount, 0);

              // 2) Calculate progress (spent vs budget amount)
              let usedPercent = 0;
              if (budget.amount > 0) {
                usedPercent = (spent / budget.amount) * 100;
                usedPercent = Math.min(100, Math.max(0, usedPercent));
              }

              return (
                <div
                  key={budget.id}
                  className="p-3 rounded-md border border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: budget.color + '1A' }} // lightly tinted background
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <strong>{budget.name}</strong>{' '}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({formatCurrency(budget.amount)})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomBudget(budget.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>

                  {/* Budget-specific progress bar */}
                  <div
                    className="relative w-full h-4 rounded-full overflow-hidden"
                    style={{ backgroundColor: budget.color + '33' }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${usedPercent}%`,
                        backgroundColor: budget.color
                      }}
                    />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white font-medium">
                      {Math.round(usedPercent)}%
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Spent {formatCurrency(spent)} out of {formatCurrency(budget.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD TRANSACTION */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Add Transaction</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Enter a <strong>negative amount</strong> for a credit/refund.  
          Optionally link it to a custom budget below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={newTransaction.description}
              onChange={(e) =>
                setNewTransaction({ ...newTransaction, description: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                $
              </span>
              <input
                type="number"
                value={newTransaction.amount}
                onChange={(e) =>
                  setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })
                }
                className="pl-8 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
              />
            </div>
            <small className="text-gray-500 dark:text-gray-400">
              (Use <strong>negative</strong> for credits)
            </small>
          </div>

          {/* Budget dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Budget
            </label>
            <select
              value={newTransaction.budgetId}
              onChange={(e) =>
                setNewTransaction({ ...newTransaction, budgetId: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm"
            >
              <option value="">-- None --</option>
              {customBudgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add button */}
          <button
            onClick={handleAddTransaction}
            className="flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors mt-6"
          >
            <Plus className="mr-1" size={20} />
            Add
          </button>
        </div>

        {/* TRANSACTIONS LIST */}
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
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b dark:border-gray-700">
                  <td className="py-2 pr-4">
                    {editingTransactionId === transaction.id ? (
                      <input
                        type="text"
                        value={editedTransaction?.description || ''}
                        onChange={(e) =>
                          setEditedTransaction({
                            ...editedTransaction!,
                            description: e.target.value
                          })
                        }
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-1 text-sm"
                      />
                    ) : (
                      transaction.description
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editingTransactionId === transaction.id ? (
                      <input
                        type="number"
                        value={editedTransaction?.amount || 0}
                        onChange={(e) =>
                          setEditedTransaction({
                            ...editedTransaction!,
                            amount: Number(e.target.value)
                          })
                        }
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-1 text-sm"
                      />
                    ) : (
                      formatCurrency(transaction.amount)
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {/* Show budget color + name */}
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: transaction.color }}
                      />
                      {customBudgets.find((b) => b.id === transaction.budgetId)?.name || ''}
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    {editingTransactionId === transaction.id ? (
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
                          onClick={() => handleEditTransaction(transaction)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
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
