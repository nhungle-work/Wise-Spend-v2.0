import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { getSheetRows, appendRow, updateRow } from '../lib/googleSheets';
import { 
  ChevronDown, 
  Edit, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  PlayCircle,
  Save,
  RefreshCw,
  Database,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../lib/utils';

const generateMonthsList = () => {
  const list = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    list.push({
      label: d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
      month: d.getMonth(),
      year: d.getFullYear(),
      key: `${d.getFullYear()}-${d.getMonth() + 1}`
    });
  }
  return list;
};

const parseTransactionMonthYear = (dateStr: string) => {
  try {
    if (!dateStr) return null;
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1; // 1-indexed

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      year = Number(parts[0]);
      month = Number(parts[1]);
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts[0].length === 4) {
        year = Number(parts[0]);
        month = Number(parts[1]);
      } else {
        year = Number(parts[2]);
        month = Number(parts[1]);
      }
    }
    return { year, month, key: `${year}-${month}` };
  } catch {
    return null;
  }
};

export function Tracker() {
  const monthsList = generateMonthsList();
  const [allBudgets, setAllBudgets] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [historyTxs, setHistoryTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(monthsList[0].key);
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);

  useEffect(() => {
    const [yearStr, monthStr] = selectedMonthKey.split('-');
    const y = Number(yearStr);
    const m = Number(monthStr);
    
    const filtered = allBudgets.filter(b => b.month === m && b.year === y);
    setBudgets(filtered);
  }, [allBudgets, selectedMonthKey]);

  const currentMonthYear = monthsList.find(m => m.key === selectedMonthKey)?.label || monthsList[0].label;

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= orderedCategories.length) return;

    const newList = [...orderedCategories];
    const temp = newList[index];
    newList[index] = newList[nextIndex];
    newList[nextIndex] = temp;

    setOrderedCategories(newList);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [txs, monthlyRes] = await Promise.all([
        getSheetRows("Transaction").catch(() => []),
        getSheetRows("Monthly Plan").catch(() => [])
      ]);

      let freshMonthlyRes = monthlyRes;
      if (!monthlyRes || monthlyRes.length === 0) {
        const monthlyHeaders = ["Danh mục", "Hạn mức", "Tháng", "Năm"];
        await appendRow("Monthly Plan", monthlyHeaders).catch((e) => console.warn("Failed to write monthly headers:", e));
        freshMonthlyRes = [monthlyHeaders];
      } else if (monthlyRes[0][0] === "category" || monthlyRes[0][0] === "category_name") {
        const monthlyHeaders = ["Danh mục", "Hạn mức", "Tháng", "Năm"];
        await updateRow("Monthly Plan", 1, monthlyHeaders).catch((e) => console.warn("Failed to upgrade monthly headers:", e));
        freshMonthlyRes = [...monthlyRes];
        freshMonthlyRes[0] = monthlyHeaders;
      }

      if (freshMonthlyRes && freshMonthlyRes.length > 1) {
        const formatted = freshMonthlyRes.slice(1).map((r: any, idx: number) => ({
          id: `${r[0]}-${r[2]}-${r[3]}`,
          category: r[0],
          monthly_limit: Number(r[1] || 0),
          month: Number(r[2]),
          year: Number(r[3]),
          rowNumber: idx + 2
        })).filter((b: any) => b.category);
        setAllBudgets(formatted);
      } else {
        setAllBudgets([]);
      }

      if (txs && txs.length > 1) {
        const formatted = txs.slice(1).map((r: any) => ({
          id: r[0],
          date: r[1],
          category: r[2],
          type: r[3],
          amount: Number(r[4] || 0),
          note: r[5]
        })).filter((t: any) => t.id);
        setHistoryTxs(formatted);
      } else {
        setHistoryTxs([]);
      }
    } catch (err) {
      console.error("Error loading tracker data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Chưa đăng nhập");
      const userId = session.user.id;

      const [yearStr, monthStr] = selectedMonthKey.split('-');
      const selectedYear = Number(yearStr);
      const selectedMonth = Number(monthStr);

      // Load all raw rows from Monthly Plan tab to get accurate row numbers
      const rows = await getSheetRows("Monthly Plan").catch(() => []);
      
      for (const cat of orderedCategories) {
        const draftLimit = draftBudgets[cat] ?? 0;
        
        // Find if this category already has a row for the selected month/year
        // index 0 is header, so rows are offset by 1
        let existingRowIndex = -1;
        if (rows && rows.length > 0) {
          existingRowIndex = rows.findIndex((r: any, idx: number) => {
            if (idx === 0) return false; // skip header
            return r[0] === cat && Number(r[2]) === selectedMonth && Number(r[3]) === selectedYear;
          });
        }

        if (existingRowIndex !== -1) {
          // Update existing row
          const rowNumber = existingRowIndex + 1; // 1-based index in Google Sheets
          await updateRow("Monthly Plan", rowNumber, [
            cat,
            draftLimit.toString(),
            selectedMonth.toString(),
            selectedYear.toString()
          ]);
        } else if (draftLimit > 0) {
          // Append new row
          await appendRow("Monthly Plan", [
            cat,
            draftLimit.toString(),
            selectedMonth.toString(),
            selectedYear.toString()
          ]);
        }
      }

      // Save category order to LocalStorage
      localStorage.setItem(`wisespend_category_order_${userId}`, JSON.stringify(orderedCategories));

      setIsEditing(false);
      await loadAllData();
    } catch (err: any) {
      console.error("Error saving budget plan:", err);
      alert(err.message || "Đã xảy ra lỗi khi lưu kế hoạch ngân sách.");
    } finally {
      setSavingPlan(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    const initializeOrder = async () => {
      const expenseTxs = historyTxs.filter(t => {
        if (t.type !== 'CHI') return false;
        const parsed = parseTransactionMonthYear(t.date);
        return parsed ? parsed.key === selectedMonthKey : false;
      });

      const spentByCategory = expenseTxs.reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0);
        return acc;
      }, {});

      const rawCategories = Array.from(new Set([
        ...budgets.map(b => b.category),
        ...Object.keys(spentByCategory)
      ]));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const stored = localStorage.getItem(`wisespend_category_order_${session.user.id}`);
        if (stored) {
          try {
            const savedOrder: string[] = JSON.parse(stored);
            // Sort categories by savedOrder, append any missing categories to the end
            const sorted = [...rawCategories].sort((a, b) => {
              const idxA = savedOrder.indexOf(a);
              const idxB = savedOrder.indexOf(b);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
            setOrderedCategories(sorted);
            return;
          } catch (e) {
            console.error("Error parsing saved category order:", e);
          }
        }
      }
      setOrderedCategories(rawCategories);
    };

    initializeOrder();
  }, [budgets, historyTxs, selectedMonthKey]);

  const getWeekIndex = (dateStr: string) => {
    try {
      let day = 1;
      if (dateStr.includes('-')) {
        day = Number(dateStr.split('-')[2]);
      } else if (dateStr.includes('/')) {
        day = Number(dateStr.split('/')[0]);
      }
      if (day <= 7) return 0;
      if (day <= 14) return 1;
      if (day <= 21) return 2;
      return 3;
    } catch {
      return 0;
    }
  };

  const expenseTxs = historyTxs.filter(t => {
    if (t.type !== 'CHI') return false;
    const parsed = parseTransactionMonthYear(t.date);
    return parsed ? parsed.key === selectedMonthKey : false;
  });

  const spentByCategory = expenseTxs.reduce((acc: Record<string, number>, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0);
    return acc;
  }, {});

  const weeklySpentByCategory = expenseTxs.reduce((acc: Record<string, number[]>, t) => {
    if (!acc[t.category]) acc[t.category] = [0, 0, 0, 0];
    const wIdx = getWeekIndex(t.date);
    acc[t.category][wIdx] += Number(t.amount || 0);
    return acc;
  }, {});

  const allCategories = Array.from(new Set([
    ...budgets.map(b => b.category),
    ...Object.keys(spentByCategory)
  ]));

  const tableRows = orderedCategories.map(cat => {
    const budgetObj = budgets.find(b => b.category === cat);
    const budgetLimit = isEditing
      ? (draftBudgets[cat] ?? 0)
      : (budgetObj ? budgetObj.monthly_limit : 0);
    const weekly = weeklySpentByCategory[cat] || [0, 0, 0, 0];
    const totalSpent = spentByCategory[cat] || 0;
    const perc = budgetLimit > 0 ? Math.round((totalSpent / budgetLimit) * 100) : 0;
    const remaining = budgetLimit - totalSpent;
    return {
      id: budgetObj?.id || null,
      category: cat,
      budget: budgetLimit,
      w1: weekly[0],
      w2: weekly[1],
      w3: weekly[2],
      w4: weekly[3],
      total: totalSpent,
      perc,
      remaining
    };
  });

  const totalBudget = isEditing
    ? Object.values(draftBudgets).reduce((sum: number, val: number) => sum + val, 0)
    : budgets.reduce((sum, b) => sum + Number(b.monthly_limit || 0), 0);
  const totalSpent = expenseTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalSavings = historyTxs
    .filter(t => t.type === 'TIẾT KIỆM' && parseTransactionMonthYear(t.date)?.key === selectedMonthKey)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallSpentPerc = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const sortedSpent = Object.entries(spentByCategory)
    .map(([name, val]) => ({ name, value: Number(val) }))
    .sort((a, b) => b.value - a.value);

  const totalSpentForPie = sortedSpent.reduce((sum, item) => sum + item.value, 0);

  const colors = ['#2563eb', '#712ae2', '#ef4444', '#d97706', '#10b981', '#ec4899'];
  const pieChartData = sortedSpent.map((item, index) => {
    const perc = totalSpentForPie > 0 ? Math.round((item.value / totalSpentForPie) * 100) : 0;
    return {
      name: item.name,
      value: perc,
      amount: item.value,
      color: colors[index % colors.length]
    };
  });

  // Default empty pie chart placeholder when no spent
  const defaultPieData = [{ name: "Chưa chi tiêu", value: 100, color: "#cbd5e1" }];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">

      {/* Local-First Architecture Status Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              Dữ liệu Đồng bộ Google Sheets
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Trực tuyến</span>
            </h4>
            <p className="text-xs text-blue-700/80 mt-1">Toàn bộ ngân sách và chi tiêu đang được hiển thị thời gian thực từ Google Sheets của bạn.</p>
          </div>
        </div>
        <button 
          onClick={loadAllData}
          className="flex items-center gap-2 bg-white border border-blue-200 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-100 hover:border-blue-300 transition-all shrink-0 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Đồng bộ lại từ Google Sheets
        </button>
      </div>
      
      {/* Top Config Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="appearance-none bg-white pl-4 pr-10 py-2 rounded-lg border border-slate-200 text-sm font-bold shadow-sm hover:bg-slate-50 cursor-pointer outline-none uppercase text-slate-800"
            >
              {monthsList.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => {
                if (isEditing) {
                  if (window.confirm("Bạn có chắc chắn muốn hủy các thay đổi chưa lưu?")) {
                    setIsEditing(false);
                  }
                } else {
                  setIsEditing(false);
                }
              }}
              className={cn(
                "px-4 py-1.5 rounded text-xs font-bold transition-all",
                !isEditing
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              TRACK
            </button>
            <button
              onClick={() => {
                if (!isEditing) {
                  const initialDrafts: Record<string, number> = {};
                  orderedCategories.forEach(cat => {
                    const budgetObj = budgets.find(b => b.category === cat);
                    initialDrafts[cat] = budgetObj ? budgetObj.monthly_limit : 0;
                  });
                  setDraftBudgets(initialDrafts);
                  setIsEditing(true);
                }
              }}
              className={cn(
                "px-4 py-1.5 rounded text-xs font-bold transition-all",
                isEditing
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              PLAN
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (window.confirm("Bạn có chắc chắn muốn hủy các thay đổi?")) {
                  setIsEditing(false);
                }
              }}
              className="flex items-center gap-2 px-5 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSavePlan}
              disabled={savingPlan}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingPlan ? "Đang lưu..." : "Lưu kế hoạch"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              const initialDrafts: Record<string, number> = {};
              orderedCategories.forEach(cat => {
                const budgetObj = budgets.find(b => b.category === cat);
                initialDrafts[cat] = budgetObj ? budgetObj.monthly_limit : 0;
              });
              setDraftBudgets(initialDrafts);
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-6 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Chỉnh kế hoạch
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm font-bold text-slate-400">Đang tải kế hoạch ngân sách...</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-12 gap-6">
            
            {/* Pie Chart Card */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full z-0 relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Cơ cấu chi tiêu</h3>
                <span className="text-xs text-slate-500">theo danh mục</span>
              </div>

              <div className="flex-1 flex flex-col min-h-0 relative">
                 {/* Chart wrapper */}
                 <div className="flex-none h-48 relative mx-auto w-full -mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData.length > 0 ? pieChartData : defaultPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={4}
                        >
                          {(pieChartData.length > 0 ? pieChartData : defaultPieData).map((entry: any, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Inner text inside donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
                      <span className="text-xl font-black text-slate-900 -mb-1">
                        {totalSpentForPie > 0 ? `${(totalSpentForPie / 1000000).toFixed(1)}M` : "0đ"}
                      </span>
                      <span className="text-[10px] text-slate-500">Đã chi tiêu</span>
                    </div>
                 </div>
                 
                 {/* Legend */}
                 <div className="mt-4 px-2 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                   {pieChartData.length > 0 ? (
                     pieChartData.map(item => (
                       <div key={item.name} className="flex justify-between items-center text-sm">
                         <div className="flex items-center gap-2">
                           <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                           <span className="font-medium text-slate-700">{item.name}</span>
                         </div>
                         <span className="font-bold text-slate-900">{item.value}%</span>
                       </div>
                     ))
                   ) : (
                     <div className="text-center text-xs text-slate-400 py-6">Chưa phát sinh giao dịch chi tiêu nào.</div>
                   )}
                 </div>
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600 relative overflow-hidden group">
                <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                </div>
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider relative z-10">TỔNG NGÂN SÁCH</p>
                <p className="text-3xl font-black text-blue-600 relative z-10">{totalBudget.toLocaleString('vi-VN')}đ</p>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 relative z-10 font-medium">
                  Hạn mức kế hoạch tháng này
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-red-500 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider relative z-10">ĐÃ CHI TIÊU</p>
                <p className="text-3xl font-black text-red-500 relative z-10">{totalSpent.toLocaleString('vi-VN')}đ</p>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 relative z-10 font-medium">
                  <AlertTriangle className={cn("w-4 h-4", overallSpentPerc > 90 ? "text-red-500" : "text-orange-500")} /> {overallSpentPerc}% hạn mức
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-purple-600 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                </div>
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider relative z-10">GIỮ LẠI (TÍCH LŨY)</p>
                <p className="text-3xl font-black text-purple-600 relative z-10">{totalSavings.toLocaleString('vi-VN')}đ</p>
                <p className="text-xs text-slate-500 mt-2 relative z-10">Số tiền đã gửi tiết kiệm</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600/30 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                </div>
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider relative z-10">CÒN LẠI</p>
                <p className="text-3xl font-black text-slate-900 relative z-10">
                  {totalRemaining < 0 ? "Vượt hạn mức" : `${totalRemaining.toLocaleString('vi-VN')}đ`}
                </p>
                <p className="text-xs text-slate-500 mt-2 relative z-10">Dự kiến chi tiêu an toàn</p>
              </div>
            </div>

          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Bảng Theo Dõi Chi Tiết</h2>
              <div className="flex gap-2">
                <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">Export CSV</button>
                <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">Filter</button>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-4 border-r border-slate-200">Danh mục</th>
                    <th className="px-4 py-4 border-r border-slate-200 text-right">Budget (k)</th>
                    <th className="px-4 py-4 text-center">Tuần 1</th>
                    <th className="px-4 py-4 text-center">Tuần 2</th>
                    <th className="px-4 py-4 text-center">Tuần 3</th>
                    <th className="px-4 py-4 text-center border-r border-slate-200">Tuần 4</th>
                    <th className="px-4 py-4 bg-slate-100/50 text-right">Tổng</th>
                    <th className="px-4 py-4">Tỷ lệ</th>
                    <th className="px-4 py-4 text-purple-600 text-right">Còn lại</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {!isEditing && expenseTxs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-sm font-semibold text-slate-400 italic">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    <>
                      {tableRows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors even:bg-slate-50/30">
                          <td className="px-4 py-3 font-bold text-slate-800 border-r border-slate-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>{row.category}</span>
                              {isEditing && (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => moveCategory(i, 'up')}
                                    disabled={i === 0}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                    title="Di chuyển lên"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveCategory(i, 'down')}
                                    disabled={i === tableRows.length - 1}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                    title="Di chuyển xuống"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium border-r border-slate-200">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  value={draftBudgets[row.category] ?? 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setDraftBudgets(prev => ({
                                      ...prev,
                                      [row.category]: val
                                    }));
                                  }}
                                  className="w-24 px-2 py-1 text-right border border-blue-400 rounded focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                />
                                <span className="text-xs text-slate-400">đ</span>
                              </div>
                            ) : (
                              <span>{(row.budget / 1000).toLocaleString('vi-VN')}k</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">{row.w1 ? `${(row.w1 / 1000).toFixed(0)}k` : '-'}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{row.w2 ? `${(row.w2 / 1000).toFixed(0)}k` : '-'}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{row.w3 ? `${(row.w3 / 1000).toFixed(0)}k` : '-'}</td>
                          <td className="px-4 py-3 text-center border-r border-slate-200 text-slate-600">{row.w4 ? `${(row.w4 / 1000).toFixed(0)}k` : '-'}</td>
                          <td className="px-4 py-3 font-bold bg-slate-50/50 text-right">{(row.total / 1000).toLocaleString('vi-VN')}k</td>
                          <td className="px-4 py-3 font-medium">
                            <span className={cn("px-2 py-0.5 rounded text-[10px]", row.perc > 90 ? "bg-red-100 text-red-700" : row.perc > 80 ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>
                              {row.perc}%
                            </span>
                          </td>
                          <td className={cn(
                            "px-4 py-3 font-bold text-right",
                            row.remaining < 0 ? "text-red-600" : "text-blue-700"
                          )}>
                            {(row.remaining / 1000).toLocaleString('vi-VN')}k
                          </td>
                        </tr>
                      ))}
                      {isEditing && (
                        <tr className="bg-blue-50/50">
                          <td className="px-4 py-3 border-r border-slate-200 font-bold">
                            <input
                              type="text"
                              placeholder="Tên danh mục mới..."
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="w-full px-3 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold text-slate-800 bg-white"
                            />
                          </td>
                          <td className="px-4 py-3 border-r border-slate-200 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                placeholder="Ngân sách"
                                value={newCategoryLimit}
                                onChange={(e) => setNewCategoryLimit(e.target.value)}
                                className="w-24 px-2 py-1 text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold bg-white"
                              />
                              <span className="text-xs text-slate-400">đ</span>
                            </div>
                          </td>
                          <td colSpan={6} className="px-4 py-3 border-r border-slate-200"></td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newCategoryName.trim()) return;
                                const catName = newCategoryName.trim();
                                const limit = Number(newCategoryLimit) || 0;

                                setDraftBudgets(prev => ({
                                  ...prev,
                                  [catName]: limit
                                }));

                                setBudgets(prev => {
                                  if (prev.some(b => b.category === catName)) return prev;
                                  return [...prev, { id: null, category: catName, monthly_limit: limit }];
                                });

                                setOrderedCategories(prev => {
                                  if (prev.includes(catName)) return prev;
                                  return [...prev, catName];
                                });

                                setNewCategoryName('');
                                setNewCategoryLimit('');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-all active:scale-95"
                            >
                              Thêm
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
                {tableRows.length > 0 && (isEditing || expenseTxs.length > 0) && (
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-4 border-r border-slate-200">TỔNG CỘNG</td>
                      <td className="px-4 py-4 border-r border-slate-200 text-right">{(totalBudget / 1000).toLocaleString('vi-VN')}k</td>
                      <td colSpan={4} className="px-4 py-4 text-center border-r border-slate-200 text-sm text-slate-500">
                        Ghi nhận {expenseTxs.length} giao dịch chi tiêu
                      </td>
                      <td className="px-4 py-4 text-right">{(totalSpent / 1000).toLocaleString('vi-VN')}k</td>
                      <td className="px-4 py-4">{overallSpentPerc}%</td>
                      <td className="px-4 py-4 text-blue-600 text-right">{(totalRemaining / 1000).toLocaleString('vi-VN')}k</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Reflection Area */}
          <section className="pt-4 border-t border-slate-200">
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Đánh giá tháng này</h3>
              <span className="text-sm font-medium text-slate-500 uppercase">{currentMonthYear}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* KEEP */}
              <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wider">KEEP (Duy trì)</h4>
                </div>
                 <p className="text-xs text-emerald-600/80 mb-4 font-medium">Những thói quen tốt cần phát huy</p>
                <ul className="space-y-3 text-sm text-slate-700 font-medium">
                  <li className="flex gap-3"><span className="text-emerald-500">•</span> Tự nấu ăn sáng tại nhà</li>
                  <li className="flex gap-3"><span className="text-emerald-500">•</span> Sử dụng phương tiện công cộng</li>
                  <li className="flex gap-3"><span className="text-emerald-500">•</span> Tiết kiệm 10% thu nhập</li>
                </ul>
              </div>

              {/* STOP */}
              <div className="bg-red-50/50 rounded-2xl border border-red-100 p-6 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider">STOP (Dừng lại)</h4>
                </div>
                <p className="text-xs text-red-600/80 mb-4 font-medium">Những khoản chi lãng phí cần cắt bỏ</p>
                <ul className="space-y-3 text-sm text-slate-700 font-medium">
                  <li className="flex gap-3"><span className="text-red-500">•</span> Đặt đồ ăn ngoài vào ban đêm</li>
                  <li className="flex gap-3"><span className="text-red-500">•</span> Mua sắm ngẫu hứng trên sàn TMĐT</li>
                  <li className="flex gap-3"><span className="text-red-500">•</span> Các gói subscription không dùng</li>
                </ul>
              </div>

              {/* START */}
              <div className="bg-purple-50/50 rounded-2xl border border-purple-100 p-6 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-purple-600" />
                <div className="flex items-center gap-2 mb-2">
                  <PlayCircle className="w-5 h-5 text-purple-700" />
                  <h4 className="text-sm font-bold text-purple-800 uppercase tracking-wider">START (Bắt đầu)</h4>
                </div>
                <p className="text-xs text-purple-700/80 mb-4 font-medium">Thói quen mới muốn thử nghiệm</p>
                <ul className="space-y-3 text-sm text-slate-700 font-medium">
                  <li className="flex gap-3"><span className="text-purple-600">•</span> Ghi chép giao dịch {'\>'} 50k</li>
                  <li className="flex gap-3"><span className="text-purple-600">•</span> Lên thực đơn tuần vào Chủ Nhật</li>
                  <li className="flex gap-3"><span className="text-purple-600">•</span> Theo dõi các khoản chi vặt</li>
                </ul>
              </div>
            </div>

            {/* Note Area */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
               <label className="text-sm font-bold text-slate-900 block">Nhận xét & Ghi chú cuối tháng</label>
               <textarea 
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none min-h-[120px]"
                 placeholder="Nhập suy nghĩ của bạn về tình hình tài chính tháng này..."
               />
               <div className="flex justify-end">
                 <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center gap-2 active:scale-95">
                   <Save className="w-4 h-4" />
                   Lưu ghi chú
                 </button>
               </div>
            </div>
          </section>
        </>
      )}

    </div>
  );
}
