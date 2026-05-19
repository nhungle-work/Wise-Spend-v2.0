import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { appendRow, getSheetRows, updateRow } from '../lib/googleSheets';
import {
  CalendarDays,
  Wallet,
  PiggyBank,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  SkipForward,
  Coins,
  Banknote,
  CreditCard,
  Landmark,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
interface WalletEntry {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash';
  balance: string;
}

interface BudgetEntry {
  id: string;
  category: string;
  limit: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────
const CYCLE_OPTIONS = [
  { day: 1,  label: 'Ngày 1',  desc: 'Đầu tháng dương lịch' },
  { day: 5,  label: 'Ngày 5',  desc: 'Phổ biến với lương tháng' },
  { day: 10, label: 'Ngày 10', desc: 'Phổ biến với lương tháng' },
  { day: 15, label: 'Ngày 15', desc: 'Giữa tháng' },
  { day: 25, label: 'Ngày 25', desc: 'Gần cuối tháng' },
];

const WALLET_TYPES = [
  { value: 'bank',    label: 'Ngân hàng', icon: Landmark  },
  { value: 'ewallet', label: 'Ví điện tử', icon: Wallet    },
  { value: 'cash',    label: 'Tiền mặt',   icon: Banknote  },
] as const;

const BUDGET_CATEGORIES = [
  'Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Sức khỏe',
  'Giáo dục', 'Nhà ở', 'Tiện ích', 'Bảo hiểm', 'Khác',
];

const STEPS = [
  { id: 1, label: 'Chu kỳ tháng',    icon: CalendarDays },
  { id: 2, label: 'Số dư hiện tại',  icon: Wallet       },
  { id: 3, label: 'Kế hoạch ngân sách', icon: PiggyBank },
];

// ────────────────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);

const formatMoney = (raw: string) => {
  const num = raw.replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('vi-VN');
};

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────
export function Onboarding() {
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [customDay, setCustomDay] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Step 2
  const [wallets, setWallets] = useState<WalletEntry[]>([
    { id: uid(), name: '', type: 'bank', balance: '' },
  ]);

  // Step 3
  const [budgets, setBudgets] = useState<BudgetEntry[]>([
    { id: uid(), category: 'Ăn uống', limit: '' },
  ]);

  // ── Step 2 helpers ────────────────────────────────────────────────────────
  const addWallet = () =>
    setWallets((prev) => [...prev, { id: uid(), name: '', type: 'bank', balance: '' }]);

  const removeWallet = (id: string) =>
    setWallets((prev) => prev.filter((w) => w.id !== id));

  const updateWallet = (id: string, field: keyof WalletEntry, value: string) =>
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const updated = { ...w };
          if (field === 'type') {
            updated.type = value as any;
            if (value === 'cash') {
              updated.name = 'Tiền mặt';
            } else if (w.type === 'cash' || w.name === 'Tiền mặt') {
              updated.name = '';
            }
          } else if (field === 'balance') {
            updated.balance = value.replace(/\D/g, '');
          } else {
            updated.name = value;
          }
          return updated;
        }
        return w;
      })
    );

  // ── Step 3 helpers ────────────────────────────────────────────────────────
  const addBudget = () =>
    setBudgets((prev) => [...prev, { id: uid(), category: 'Khác', limit: '' }]);

  const removeBudget = (id: string) =>
    setBudgets((prev) => prev.filter((b) => b.id !== id));

  const updateBudget = (id: string, field: keyof BudgetEntry, value: string) =>
    setBudgets((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, [field]: field === 'limit' ? value.replace(/\D/g, '') : value }
          : b
      )
    );

  // ── Navigation ────────────────────────────────────────────────────────────
  const effectiveCycleDay = useCustom ? Number(customDay) || 1 : cycleDay;

  const canProceedStep1 = useCustom
    ? Number(customDay) >= 1 && Number(customDay) <= 31
    : true;

  const canProceedStep2 = wallets.every((w) => w.name.trim() !== '');

  const next = () => {
    setError(null);
    if (step === 1 && !canProceedStep1) {
      setError('Vui lòng nhập ngày hợp lệ từ 1-31.');
      return;
    }
    if (step === 2 && !canProceedStep2) {
      setError('Vui lòng đặt tên cho tất cả các tài khoản/ví.');
      return;
    }
    setStep((s) => s + 1);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (skip = false) => {
    setSaving(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Chưa đăng nhập');

      const userId = session.user.id;

      // 1. Save cycle start day
      const { error: cycleErr } = await supabase.from('user_settings').upsert(
        {
          user_id: userId,
          cycle_start_day: effectiveCycleDay,
        },
        { onConflict: 'user_id' }
      );
      if (cycleErr) throw cycleErr;

      // 2. Save wallets (sources) to Google Sheets (Wallets tab)
      if (wallets.some((w) => w.name.trim())) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        for (const w of wallets) {
          if (w.name.trim()) {
            const row = [
              w.id,
              w.name.trim(),
              w.type,
              (w.balance ? Number(w.balance) : 0).toString(),
              timestamp
            ];
            await appendRow("Wallets", row);
          }
        }
      }

      // 3. Save budget plans (optional, skip if requested)
      if (!skip) {
        // Check/initialize headers for Monthly Plan sheet
        const monthlyRes = await getSheetRows("Monthly Plan").catch(() => []);
        if (!monthlyRes || monthlyRes.length === 0) {
          const monthlyHeaders = ["Danh mục", "Hạn mức", "Tháng", "Năm"];
          await appendRow("Monthly Plan", monthlyHeaders).catch((e) => console.warn("Failed to write monthly headers:", e));
        } else if (monthlyRes[0][0] === "category" || monthlyRes[0][0] === "category_name") {
          const monthlyHeaders = ["Danh mục", "Hạn mức", "Tháng", "Năm"];
          await updateRow("Monthly Plan", 1, monthlyHeaders).catch((e) => console.warn("Failed to upgrade monthly headers:", e));
        }

        const currentMonth = (new Date().getMonth() + 1).toString();
        const currentYear = new Date().getFullYear().toString();
        const activeBudgets = budgets.filter((b) => b.category.trim() && b.limit);
        for (const b of activeBudgets) {
          const row = [
            b.category.trim(),
            Number(b.limit).toString(),
            currentMonth,
            currentYear
          ];
          await appendRow("Monthly Plan", row);
        }
      }

      // Mark onboarding complete
      await supabase.from('user_settings').upsert(
        {
          user_id: userId,
          onboarding_completed: true,
          cycle_start_day: effectiveCycleDay,
        },
        { onConflict: 'user_id' }
      );

      navigate('/record');
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start pt-8 pb-16 px-4">
      {/* Header */}
      <header className="w-full max-w-2xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-blue-600" />
          <span className="text-lg font-black text-blue-600">WiseSpend</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => navigate('/auth'))}
          className="text-xs font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider transition-colors"
        >
          Đăng xuất
        </button>
      </header>

      {/* Progress Steps */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 z-0" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-blue-600 z-0 transition-all duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map(({ id, label, icon: Icon }) => (
            <div key={id} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
                  step > id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : step === id
                    ? 'bg-white border-blue-600 text-blue-600'
                    : 'bg-white border-slate-200 text-slate-400'
                )}
              >
                {step > id ? <CheckCircle2 className="w-4 h-4" /> : id}
              </div>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider mt-2 text-center leading-tight max-w-[80px]',
                  step === id ? 'text-blue-600' : step > id ? 'text-slate-600' : 'text-slate-400'
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">

        {/* ── STEP 1: Chu kỳ tháng ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900">Thiết lập Chu kỳ tháng</h1>
                  <p className="text-xs text-slate-500">Ngày bắt đầu mỗi kỳ thu chi của bạn</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {CYCLE_OPTIONS.map((opt) => (
                <button
                  key={opt.day}
                  onClick={() => { setCycleDay(opt.day); setUseCustom(false); }}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center',
                    !useCustom && cycleDay === opt.day
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-blue-300 text-slate-600'
                  )}
                >
                  <span className="text-2xl font-black">{opt.day}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide mt-1">{opt.label}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom day */}
            <div
              onClick={() => setUseCustom(true)}
              className={cn(
                'p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4',
                useCustom ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
              )}
            >
              <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center shrink-0">
                {useCustom ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                ) : (
                  <Plus className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 flex items-center gap-3">
                <span className={cn('text-sm font-bold', useCustom ? 'text-blue-700' : 'text-slate-600')}>
                  Ngày khác:
                </span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={customDay}
                  onClick={(e) => { e.stopPropagation(); setUseCustom(true); }}
                  onChange={(e) => setCustomDay(e.target.value)}
                  placeholder="1–31"
                  className="w-20 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-center"
                />
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800 leading-relaxed">
              💡 Bạn có thể thay đổi chu kỳ này bất kỳ lúc nào trong phần <strong>Cài đặt</strong>.
            </div>
          </div>
        )}

        {/* ── STEP 2: Số dư hiện tại ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">Thiết lập Số dư hiện tại</h1>
                <p className="text-xs text-slate-500">Số dư bạn nhập là mốc reset để tính từ đó trở đi</p>
              </div>
            </div>

            <div className="space-y-3">
              {wallets.map((wallet, idx) => (
                <div key={wallet.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Tài khoản/ví #{idx + 1}
                    </span>
                    {wallets.length > 1 && (
                      <button
                        onClick={() => removeWallet(wallet.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Type selector */}
                  <div className="flex gap-2">
                    {WALLET_TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => updateWallet(wallet.id, 'type', value)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                          wallet.type === value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                   <div className="flex gap-3">
                    {wallet.type !== 'cash' ? (
                      <input
                        type="text"
                        value={wallet.name}
                        onChange={(e) => updateWallet(wallet.id, 'name', e.target.value)}
                        placeholder={
                          wallet.type === 'bank'
                            ? 'VD: Vietcombank'
                            : 'VD: Ví MoMo'
                        }
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    ) : (
                      <div className="flex-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center">
                        Tiền mặt
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        value={formatMoney(wallet.balance)}
                        onChange={(e) => updateWallet(wallet.id, 'balance', e.target.value)}
                        placeholder="Số dư"
                        className="w-36 bg-white border border-slate-200 rounded-xl pr-6 pl-4 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₫</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addWallet}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Thêm tài khoản/ví
            </button>
          </div>
        )}

        {/* ── STEP 3: Kế hoạch ngân sách ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">Kế hoạch Ngân sách</h1>
                <p className="text-xs text-slate-500">Đặt hạn mức chi tiêu cho từng danh mục (có thể bỏ qua)</p>
              </div>
            </div>

            <div className="space-y-3">
              {budgets.map((budget, idx) => (
                <div key={budget.id} className="flex items-center gap-3">
                  <select
                    value={budget.category}
                    onChange={(e) => updateBudget(budget.id, 'category', e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                  >
                    {BUDGET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatMoney(budget.limit)}
                      onChange={(e) => updateBudget(budget.id, 'limit', e.target.value)}
                      placeholder="Hạn mức"
                      className="w-36 bg-white border border-slate-200 rounded-xl pr-6 pl-4 py-2.5 text-sm text-right outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₫</span>
                  </div>
                  {budgets.length > 1 && (
                    <button
                      onClick={() => removeBudget(budget.id)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addBudget}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/40 transition-all text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Thêm danh mục
            </button>

            <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800 leading-relaxed">
              💡 Bạn có thể bỏ qua và thiết lập ngân sách sau trong phần <strong>Cài đặt</strong>.
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className={cn('mt-8 flex gap-3', step === 1 ? 'justify-end' : 'justify-between')}>
          {step > 1 && (
            <button
              onClick={() => { setError(null); setStep((s) => s - 1); }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
          )}

          <div className="flex gap-3">
            {step === 3 && (
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" /> Bỏ qua
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={next}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all uppercase tracking-widest"
              >
                Tiếp theo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-[0.98] transition-all uppercase tracking-widest disabled:opacity-50"
              >
                {saving ? 'ĐANG LƯU...' : <><CheckCircle2 className="w-4 h-4" /> HOÀN TẤT</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step counter */}
      <p className="mt-6 text-xs text-slate-400 font-medium">
        Bước {step} / {STEPS.length}
      </p>
    </div>
  );
}
