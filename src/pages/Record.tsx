import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { appendRow, getSheetRows, updateRow, deleteRow } from '../lib/googleSheets';
import { supabase } from '../lib/supabase';
import { 
  ChevronDown, 
  Landmark, 
  ShoppingCart,
  Lightbulb,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  PiggyBank,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';

const INCOME_CATEGORIES = ['Chọn danh mục', 'Tiền lương', 'Tiền dự án', 'Thưởng', 'Khác'];
const EXPENSE_CATEGORIES = [
  'Chọn danh mục',
  'Ăn uống',
  'Mua sắm',
  'Điện nước',
  'Di chuyển',
  'Tiền thuê nhà',
  'Học tập',
  'Giải trí',
  'Gặp gỡ bạn bè',
  'Phát sinh không kế hoạch',
  'Khác'
];
const INVESTMENT_CATEGORIES = ['Chọn danh mục', 'Vàng', 'Bất động sản', 'Chứng khoán', 'Quỹ mở', 'Khác'];
const DEBT_CATEGORIES = ['Chọn danh mục', 'Cho vay', 'Nợ'];

export function Record() {
  const [activeTab, setActiveTab] = useState('CHI');
  const [useCreditCard, setUseCreditCard] = useState(false);
  const [savingsTerm, setSavingsTerm] = useState('');
  const [savingsDepositDate, setSavingsDepositDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState('Chọn danh mục');
  const [customCategory, setCustomCategory] = useState('');
  const [savingsInstitution, setSavingsInstitution] = useState('');
  const [debtPartner, setDebtPartner] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [historyTxs, setHistoryTxs] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Ăn uống', 'Di chuyển', 'Mua sắm']);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [wallets, setWallets] = useState<any[]>([]);

  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Story 7B Tracker state
  const [trackerExpanded, setTrackerExpanded] = useState(true);
  const [activeTrackerTab, setActiveTrackerTab] = useState<'SAVINGS' | 'DEBTS' | 'INVESTMENTS'>('SAVINGS');
  
  // Detail Modals
  const [selectedTrackerItem, setSelectedTrackerItem] = useState<any | null>(null);
  const [trackerItemType, setTrackerItemType] = useState<'SAVINGS' | 'DEBT' | 'INVESTMENT' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');
  
  // Real-time editable mock list state for pitch
  const [mockSavingsState, setMockSavingsState] = useState<any[]>([]);

  const [mockDebtsState, setMockDebtsState] = useState<any[]>([]);

  const [mockInvestmentsState, setMockInvestmentsState] = useState<any[]>([]);

  // Action form values
  const [actionAmount, setActionAmount] = useState('');

  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const serializeTxRow = (tx: any) => {
    return [
      tx.id,
      tx.date,
      tx.category,
      tx.type,
      tx.amount.toString(),
      tx.note || '',
      tx.payment_method || '',
      tx.credit_card_name || '',
      (tx.paid_for_others || 0).toString(),
      tx.invest_type || '',
      tx.counterparty || '',
      tx.due_date || '',
      tx.loan_status || '',
      tx.invest_status || '',
      tx.saving_place || '',
      (tx.saving_term_months || 0).toString(),
      tx.saving_maturity_date || '',
      tx.saving_status || ''
    ];
  };

  const handleResolveSaving = async (item: any) => {
    const totalRec = actionAmount ? Number(actionAmount) : item.amount;
    setIsLoadingData(true);
    try {
      if (item.isReal) {
        const origTx = historyTxs.find(t => t.id === item.id);
        if (origTx) {
          origTx.saving_status = 'closed';
          const updatedRow = serializeTxRow(origTx);
          await updateRow("Transaction", origTx.rowNumber, updatedRow);
        }
        
        // Append a new THU transaction
        const newTxId = uuidv4();
        const todayStr = new Date().toISOString().split('T')[0];
        const newRow = [
          newTxId,
          todayStr,
          'Tất toán tiết kiệm',
          'THU',
          totalRec.toString(),
          `Rút tiết kiệm từ ${item.category}`,
          '', '', '0', '', '', '', '', '', '', '0', '', ''
        ];
        await appendRow("Transaction", newRow);
      } else {
        setMockSavingsState(prev => prev.filter(s => s.id !== item.id));
      }
      setSelectedTrackerItem(null);
      setActionAmount('');
      triggerToast(`Đã tất toán khoản tiết kiệm tại ${item.category}! Nhận về ${totalRec.toLocaleString('vi-VN')}₫. Tự động ghi nhận giao dịch THU.`, 'success');
      await loadData();
    } catch (e: any) {
      triggerToast(`Lỗi tất toán: ${e.message}`, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleResolveDebt = async (item: any) => {
    setIsLoadingData(true);
    try {
      if (item.isReal) {
        const origTx = historyTxs.find(t => t.id === item.id);
        if (origTx) {
          origTx.loan_status = 'paid';
          const updatedRow = serializeTxRow(origTx);
          await updateRow("Transaction", origTx.rowNumber, updatedRow);
        }
        
        // Append new transaction (THU if receivable, CHI if payable)
        const newTxId = uuidv4();
        const todayStr = new Date().toISOString().split('T')[0];
        const type = item.isReceivable ? 'THU' : 'CHI';
        const category = item.isReceivable ? 'Thu nợ' : 'Trả nợ';
        const note = item.isReceivable ? `Thu nợ từ ${item.partner}` : `Trả nợ cho ${item.partner}`;
        const newRow = [
          newTxId,
          todayStr,
          category,
          type,
          item.amount.toString(),
          note,
          '', '', '0', '', '', '', '', '', '', '0', '', ''
        ];
        await appendRow("Transaction", newRow);
      } else {
        setMockDebtsState(prev => prev.filter(d => d.id !== item.id));
      }
      setSelectedTrackerItem(null);
      triggerToast(
        item.isReceivable 
          ? `Đã xác nhận thu hồi xong khoản nợ ${Number(item.amount).toLocaleString('vi-VN')}₫ từ ${item.partner}!`
          : `Đã xác nhận thanh toán xong khoản nợ ${Number(item.amount).toLocaleString('vi-VN')}₫ cho ${item.partner}!`, 
        'success'
      );
      await loadData();
    } catch (e: any) {
      triggerToast(`Lỗi thanh toán nợ: ${e.message}`, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleResolveInvestment = async (item: any) => {
    const saleVal = actionAmount ? Number(actionAmount) : item.amount;
    setIsLoadingData(true);
    try {
      if (item.isReal) {
        const origTx = historyTxs.find(t => t.id === item.id);
        if (origTx) {
          origTx.invest_status = 'sold';
          const updatedRow = serializeTxRow(origTx);
          await updateRow("Transaction", origTx.rowNumber, updatedRow);
        }
        
        // Append a new THU transaction
        const newTxId = uuidv4();
        const todayStr = new Date().toISOString().split('T')[0];
        const newRow = [
          newTxId,
          todayStr,
          'Bán đầu tư',
          'THU',
          saleVal.toString(),
          `Bán đầu tư ${item.category}`,
          '', '', '0', '', '', '', '', '', '', '0', '', ''
        ];
        await appendRow("Transaction", newRow);
      } else {
        setMockInvestmentsState(prev => prev.filter(i => i.id !== item.id));
      }
      setSelectedTrackerItem(null);
      setActionAmount('');
      triggerToast(`Đã tất toán đầu tư ${item.category}! Thu về ${saleVal.toLocaleString('vi-VN')}₫. Tự động ghi nhận giao dịch THU.`, 'success');
      await loadData();
    } catch (e: any) {
      triggerToast(`Lỗi tất toán đầu tư: ${e.message}`, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [txs, cats, walletsData] = await Promise.all([
        getSheetRows("Transaction").catch(() => []),
        getSheetRows("Categories").catch(() => []),
        getSheetRows("Wallets").catch(() => [])
      ]);

      if (!txs || txs.length === 0) {
        const newHeaders = [
          "Giao Dịch ID", "Ngày", "Danh mục", "Loại", "Số tiền", "Ghi chú",
          "Phương thức thanh toán", "Tên thẻ tín dụng", "Trả hộ người khác",
          "Loại đầu tư", "Đối tác giao dịch", "Hạn thanh toán", "Trạng thái khoản nợ",
          "Trạng thái đầu tư", "Nơi gửi tiết kiệm", "Kỳ hạn tiết kiệm",
          "Ngày đáo hạn tiết kiệm", "Trạng thái tiết kiệm"
        ];
        await appendRow("Transaction", newHeaders).catch((e) => console.warn("Failed to write transaction headers:", e));
      } else if (txs[0].length < 18 || txs[0][15] === "Kỳ hạn tiết kiệm (tháng)" || txs[0][0] === "id") {
        const newHeaders = [
          "Giao Dịch ID", "Ngày", "Danh mục", "Loại", "Số tiền", "Ghi chú",
          "Phương thức thanh toán", "Tên thẻ tín dụng", "Trả hộ người khác",
          "Loại đầu tư", "Đối tác giao dịch", "Hạn thanh toán", "Trạng thái khoản nợ",
          "Trạng thái đầu tư", "Nơi gửi tiết kiệm", "Kỳ hạn tiết kiệm",
          "Ngày đáo hạn tiết kiệm", "Trạng thái tiết kiệm"
        ];
        await updateRow("Transaction", 1, newHeaders).catch((e) => console.warn("Failed to upgrade transaction headers:", e));
      }

      if (!walletsData || walletsData.length === 0) {
        const walletHeaders = ["Ví ID", "Tên tài khoản", "Loại", "Số dư", "Cập nhật cuối"];
        await appendRow("Wallets", walletHeaders).catch((e) => console.warn("Failed to write wallet headers:", e));
      } else if (walletsData[0][0] === "id" || walletsData[0][0] === "name") {
        const walletHeaders = ["Ví ID", "Tên tài khoản", "Loại", "Số dư", "Cập nhật cuối"];
        await updateRow("Wallets", 1, walletHeaders).catch((e) => console.warn("Failed to upgrade wallet headers:", e));
      }

      if (walletsData && walletsData.length > 1) {
        const formattedWallets = walletsData.slice(1).map((r: any) => ({
          id: r[0],
          name: r[1],
          type: r[2],
          balance_snapshot: Number(r[3] || 0),
          updated_at: r[4]
        })).filter((w: any) => w.id);
        setWallets(formattedWallets);
      } else {
        setWallets([]);
      }

      if (txs && txs.length > 1) {
        const formatted = txs.slice(1).map((r: any, idx: number) => ({
          id: r[0],
          date: r[1],
          category: r[2],
          type: r[3],
          amount: Number(r[4] || 0),
          note: r[5],
          rowNumber: idx + 2,
          payment_method: r[6] || '',
          credit_card_name: r[7] || '',
          paid_for_others: Number(r[8] || 0),
          invest_type: r[9] || '',
          counterparty: r[10] || '',
          due_date: r[11] || '',
          loan_status: r[12] || '',
          invest_status: r[13] || '',
          saving_place: r[14] || '',
          saving_term_months: Number(r[15] || 0),
          saving_maturity_date: r[16] || '',
          saving_status: r[17] || ''
        })).filter((t: any) => t.id).reverse();
        setHistoryTxs(formatted);
      } else {
        setHistoryTxs([]);
      }
      if (cats && cats.length > 1) {
        const catList = cats.slice(1).map((c: any) => c[0]).filter(Boolean);
        if (catList.length > 0) setCategories(catList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCategory('Chọn danh mục');
    setCustomCategory('');
    setDebtPartner('');
    setSavingsInstitution('');
  }, [activeTab]);

  const openEditModal = (tx: any) => {
    setEditingTx(tx);
    setEditAmount(tx.amount || '');
    setEditNote(tx.note || '');
    setEditDate(tx.date || '');
  };

  const handleEditSave = async () => {
    if (!editingTx) return;
    setIsSavingEdit(true);
    try {
      const updatedTx = {
        ...editingTx,
        amount: Number(editAmount),
        note: editNote,
        date: editDate
      };
      const row = serializeTxRow(updatedTx);
      await updateRow("Transaction", editingTx.rowNumber, row);
      setEditingTx(null);
      await loadData();
    } catch (e: any) {
      alert("Lỗi khi sửa: " + e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTx = async (tx: any) => {
    setDeletingTxId(tx.id);
    try {
      await deleteRow("Transaction", tx.rowNumber);
      await loadData();
    } catch (e: any) {
      alert("Lỗi khi xóa: " + e.message);
    } finally {
      setDeletingTxId(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      let finalCategory = category;
      let finalDate = date;

      if (activeTab === 'TIẾT KIỆM') {
        if (!savingsInstitution.trim()) {
          throw new Error("Vui lòng nhập nơi gửi tiết kiệm.");
        }
        finalCategory = savingsInstitution.trim();
        finalDate = savingsDepositDate;
      } else {
        if (category === 'Chọn danh mục') {
          throw new Error("Vui lòng chọn danh mục.");
        }

        if ((activeTab === 'THU' || activeTab === 'ĐẦU TƯ' || activeTab === 'CHI') && category === 'Khác') {
          if (!customCategory.trim()) {
            throw new Error("Vui lòng điền tên danh mục tự chọn");
          }
          finalCategory = customCategory.trim();
        } else if (activeTab === 'VAY / NỢ') {
          if (!debtPartner.trim()) {
            throw new Error("Vui lòng nhập tên người cho vay/nợ.");
          }
          finalCategory = `${category} - ${debtPartner.trim()}`;
        }
      }

      const txId = uuidv4();
      const row = [
        txId,
        finalDate,
        finalCategory,
        activeTab,
        amount,
        note,
        useCreditCard && activeTab === 'CHI' ? 'credit' : 'cash', // payment_method
        useCreditCard && activeTab === 'CHI' ? category : '',      // credit_card_name (for card select)
        '0', // paid_for_others
        activeTab === 'ĐẦU TƯ' ? (category === 'Khác' ? customCategory.trim() : category) : '', // invest_type
        activeTab === 'VAY / NỢ' ? debtPartner.trim() : '', // counterparty
        activeTab === 'VAY / NỢ' ? finalDate : '', // due_date
        activeTab === 'VAY / NỢ' ? 'unpaid' : '', // loan_status
        activeTab === 'ĐẦU TƯ' ? 'active' : '',   // invest_status
        activeTab === 'TIẾT KIỆM' ? savingsInstitution.trim() : '', // saving_place
        activeTab === 'TIẾT KIỆM' ? selectedTermMonths.toString() : '0', // saving_term_months
        activeTab === 'TIẾT KIỆM' ? suggestedMaturity : '', // saving_maturity_date
        activeTab === 'TIẾT KIỆM' ? 'active' : ''  // saving_status
      ];
      await appendRow("Transaction", row);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setAmount('0');
      setNote('');
      setCustomCategory('');
      setDebtPartner('');
      setSavingsInstitution('');
      setCategory('Chọn danh mục');
      await loadData();
    } catch (e: any) {
      console.error("Save transaction error:", e);
      setSaveError(e.message || "Lỗi kết nối Sheet. Kiểm tra lại cấu hình Supabase.");
      setTimeout(() => setSaveError(null), 10000);
    } finally {
      setIsSaving(false);
    }
  };

  const computeMaturityDate = (depositDate: string, termMonths: number): string => {
    if (!depositDate || !termMonths) return '';
    const d = new Date(depositDate);
    d.setMonth(d.getMonth() + termMonths);
    return d.toISOString().split('T')[0];
  };

  const savingsTermOptions = [
    { label: 'Không kỳ hạn', months: 0 },
    { label: '1 tháng', months: 1 },
    { label: '2 tháng', months: 2 },
    { label: '3 tháng', months: 3 },
    { label: '6 tháng', months: 6 },
    { label: '9 tháng', months: 9 },
    { label: '12 tháng', months: 12 },
    { label: '18 tháng', months: 18 },
    { label: '24 tháng', months: 24 },
    { label: '36 tháng', months: 36 },
  ];

  const selectedTermMonths = savingsTermOptions.find(o => o.label === savingsTerm)?.months ?? 0;
  const suggestedMaturity = savingsTerm && savingsTerm !== 'Không kỳ hạn'
    ? computeMaturityDate(savingsDepositDate, selectedTermMonths)
    : '';

  const tabs = ['THU', 'CHI', 'TIẾT KIỆM', 'ĐẦU TƯ', 'VAY / NỢ'];

  // Real-time calculations
  const parsedWallets = wallets.map(w => {
    const isCredit = w.type === 'credit' || w.name.startsWith('[Credit]');
    const cleanName = w.name.startsWith('[Credit]') ? w.name.replace('[Credit]', '').trim() : w.name;
    return { ...w, isCredit, cleanName };
  });
  
  const baseBank = parsedWallets.filter(w => w.type === 'bank' && !w.isCredit).reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const baseEwallet = parsedWallets.filter(w => w.type === 'ewallet' && !w.isCredit).reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const baseCash = parsedWallets.filter(w => w.type === 'cash' && !w.isCredit).slice(0, 1).reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const baseBalance = baseBank + baseEwallet + baseCash;
  const creditCards = parsedWallets.filter(w => w.isCredit);
  
  const totalIncome = historyTxs.filter(t => t.type === 'THU').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = historyTxs.filter(t => t.type === 'CHI').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalSavings = historyTxs.filter(t => t.type === 'TIẾT KIỆM').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalInvestment = historyTxs.filter(t => t.type === 'ĐẦU TƯ').reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const currentBalance = baseBalance + totalIncome - totalExpense - totalSavings - totalInvestment;

  const realSavings = historyTxs.filter(t => t.type === 'TIẾT KIỆM' && (t.saving_status === 'active' || !t.saving_status));
  const realInvestments = historyTxs.filter(t => t.type === 'ĐẦU TƯ' && (t.invest_status === 'active' || !t.invest_status));
  const realDebts = historyTxs.filter(t => t.type === 'VAY / NỢ' && (t.loan_status === 'unpaid' || !t.loan_status));

  const combinedSavings = [
    ...realSavings.map(tx => ({
      id: tx.id,
      category: tx.saving_place || tx.category,
      amount: tx.amount,
      date: tx.date,
      term: tx.saving_term_months > 0 ? `${tx.saving_term_months} tháng` : 'Không kỳ hạn',
      maturityDate: tx.saving_maturity_date || '',
      note: tx.note || 'Từ giao dịch ghi chép',
      isReal: true,
      rowNumber: tx.rowNumber
    })),
    ...mockSavingsState
  ];
  
  const combinedDebts = [
    ...realDebts.map(tx => {
      const isReceivable = tx.category.includes('Cho vay');
      const partner = tx.counterparty || (tx.category.includes(' - ') ? tx.category.split(' - ')[1] : 'Đối tác');
      const cleanCategory = tx.category.includes(' - ') ? tx.category.split(' - ')[0] : tx.category;
      return {
        id: tx.id,
        category: cleanCategory,
        amount: tx.amount,
        date: tx.date,
        partner: partner,
        due_date: tx.due_date || 'Không có',
        note: tx.note || 'Từ giao dịch ghi chép',
        isReceivable: isReceivable,
        isReal: true,
        rowNumber: tx.rowNumber
      };
    }),
    ...mockDebtsState
  ];

  const combinedInvestments = [
    ...realInvestments.map(tx => ({
      id: tx.id,
      category: tx.category,
      amount: tx.amount,
      date: tx.date,
      type: tx.invest_type || tx.category,
      note: tx.note || 'Từ giao dịch ghi chép',
      isReal: true,
      rowNumber: tx.rowNumber
    })),
    ...mockInvestmentsState
  ];

  const totalSavingsCount = combinedSavings.length;
  const totalDebtsCount = combinedDebts.length;
  const totalInvestmentsCount = combinedInvestments.length;

  return (
    <>
    <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-12 gap-8">
      {/* Left: Input Form */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl relative overflow-hidden shadow-md shadow-blue-500/10">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-85 mb-1.5">
                Tổng số dư hiện tại
              </p>
              <h3 className="text-3xl font-black tracking-tight">
                {currentBalance.toLocaleString('vi-VN')} <span className="text-lg opacity-75 font-normal">đ</span>
              </h3>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-bold uppercase tracking-widest bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                Đồng bộ Cloud
              </span>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 animate-pulse" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-hide">
             {tabs.map(tab => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-4 px-2 text-xs font-bold uppercase tracking-wider min-w-[100px] transition-colors border-b-2",
                    activeTab === tab 
                      ? "border-blue-600 text-blue-600 bg-white" 
                      : "border-transparent text-slate-500 hover:text-blue-600 hover:bg-white/50"
                  )}
                >
                 {tab}
               </button>
             ))}
          </div>

          {/* Form Area */}
          <div className="p-8 space-y-8 flex-1">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Số tiền
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-4xl font-bold border-b-2 border-slate-200 focus:border-blue-600 focus:outline-none px-0 py-2 bg-transparent text-right pr-8 transition-colors"
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₫</span>
              </div>
            </div>

            {activeTab !== 'TIẾT KIỆM' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Danh mục
                  </label>
                  <div className="relative">
                    {activeTab === 'THU' ? (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800"
                      >
                        {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : activeTab === 'ĐẦU TƯ' ? (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800"
                      >
                        {INVESTMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : activeTab === 'VAY / NỢ' ? (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800"
                      >
                        {DEBT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800"
                      >
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Custom Category Input if "Khác" is selected */}
                  {((activeTab === 'THU' || activeTab === 'ĐẦU TƯ' || activeTab === 'CHI') && category === 'Khác') && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder={
                          activeTab === 'THU' 
                            ? "VD: Được cho tiền, Bán đồ cũ..." 
                            : activeTab === 'ĐẦU TƯ' 
                            ? "VD: Crypto, Tiền kỹ thuật số..." 
                            : "VD: Sửa xe, Khám bệnh..."
                        }
                        className="w-full bg-white border border-blue-400 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-800 placeholder-slate-400"
                        required
                      />
                    </div>
                  )}

                  {/* Partner Input for Loans & Debts */}
                  {activeTab === 'VAY / NỢ' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <input
                        type="text"
                        value={debtPartner}
                        onChange={(e) => setDebtPartner(e.target.value)}
                        placeholder="Người cho vay/nợ (VD: Anh Nam, Mẹ...)"
                        className="w-full bg-white border border-blue-400 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-800 placeholder-slate-400"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Ngày
                  </label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'CHI' && (
              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <input 
                    type="checkbox" 
                    checked={useCreditCard}
                    onChange={(e) => setUseCreditCard(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                    Trả bằng thẻ tín dụng
                  </span>
                </label>

                {useCreditCard && (
                  <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Chọn thẻ
                      </label>
                      <div className="relative">
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm appearance-none outline-none">
                          {creditCards.length > 0 ? (
                            creditCards.map(cc => (
                              <option key={cc.id} value={cc.cleanName}>{cc.cleanName}</option>
                            ))
                          ) : (
                            <option value="">Chưa có thẻ tín dụng...</option>
                          )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Trả hộ người khác
                      </label>
                      <input 
                        type="text" 
                        placeholder="Tên người nhận..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'TIẾT KIỆM' && (
              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ngày gửi</label>
                    <input
                      type="date"
                      value={savingsDepositDate}
                      onChange={e => setSavingsDepositDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Kỳ hạn</label>
                    <div className="relative">
                      <select
                        value={savingsTerm}
                        onChange={e => setSavingsTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="">Chọn kỳ hạn...</option>
                        {savingsTermOptions.map(o => (
                          <option key={o.label} value={o.label}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {suggestedMaturity && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ngày đáo hạn</label>
                    <input
                      type="date"
                      defaultValue={suggestedMaturity}
                      key={suggestedMaturity}
                      className="w-full bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-blue-700 font-medium"
                    />
                    <p className="text-[10px] text-blue-600">Gợi ý tự động từ kỳ hạn. Bạn có thể chỉnh lại nếu ngân hàng dời ngày.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nơi gửi tiết kiệm</label>
                  <input
                    type="text"
                    value={savingsInstitution}
                    onChange={e => setSavingsInstitution(e.target.value)}
                    placeholder="VD: Sacombank, Tikop, ZaloPay..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800 placeholder-slate-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ghi chú</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Không bắt buộc"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 space-y-2">
              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Đã lưu giao dịch thành công!
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {saveError}
                </div>
              )}
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? "ĐANG LƯU..." : "LƯU GIAO DỊCH"}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lịch sử giao dịch
            </h4>
            <button className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">
              XEM TẤT CẢ
            </button>
          </div>
          
          <div className="space-y-3">
            {isLoadingData ? (
              <p className="text-sm text-slate-500 py-4 text-center">Đang tải lịch sử...</p>
            ) : historyTxs.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Chưa có giao dịch nào.</p>
            ) : (
              historyTxs.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{tx.category || tx.type}</p>
                      <p className="text-xs text-slate-500">{tx.date} {tx.note && `• ${tx.note}`}</p>
                    </div>
                  </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className={cn("font-bold text-sm", tx.type === 'THU' ? 'text-emerald-600' : 'text-slate-800')}>
                        {tx.type === 'THU' ? '+' : '-'}{Number(tx.amount || 0).toLocaleString()}₫
                      </p>
                      <div className="hidden group-hover:flex items-center gap-1.5">
                        <button 
                          onClick={() => openEditModal(tx)} 
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Sửa
                        </button>
                        <button 
                          onClick={() => handleDeleteTx(tx)} 
                          disabled={deletingTxId === tx.id}
                          className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" /> {deletingTxId === tx.id ? '...' : 'Xóa'}
                        </button>
                      </div>
                    </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Sidebar */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        
        {/* Story 7B: Theo dõi tiết kiệm, nợ & Đầu tư (Collapsible) */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm transition-all overflow-hidden">
          <button 
            onClick={() => setTrackerExpanded(!trackerExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-purple-600" />
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Theo dõi tích lũy &amp; nợ
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                <span>🏦 {totalSavingsCount}</span>
                <span className="opacity-40">•</span>
                <span>💸 {totalDebtsCount}</span>
                <span className="opacity-40">•</span>
                <span>📈 {totalInvestmentsCount}</span>
              </span>
              {trackerExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {trackerExpanded && (
            <div className="border-t border-slate-100 p-4 space-y-4 animate-in slide-in-from-top duration-300">
              
              {/* Internal Tab Selector */}
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-150">
                <button
                  onClick={() => setActiveTrackerTab('SAVINGS')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                    activeTrackerTab === 'SAVINGS' 
                      ? "bg-white text-blue-600 shadow-sm font-black border border-slate-100" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  🏦 TIẾT KIỆM ({totalSavingsCount})
                </button>
                <button
                  onClick={() => setActiveTrackerTab('DEBTS')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                    activeTrackerTab === 'DEBTS' 
                      ? "bg-white text-red-600 shadow-sm font-black border border-slate-100" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  💸 NỢ ({totalDebtsCount})
                </button>
                <button
                  onClick={() => setActiveTrackerTab('INVESTMENTS')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                    activeTrackerTab === 'INVESTMENTS' 
                      ? "bg-white text-amber-650 shadow-sm font-black border border-slate-100" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  📈 ĐẦU TƯ ({totalInvestmentsCount})
                </button>
              </div>

              {/* Sub-section Content */}
              <div className="space-y-3">
                {/* 1. SAVINGS SUB-TAB */}
                {activeTrackerTab === 'SAVINGS' && (
                  <div className="space-y-3">
                    {combinedSavings.length === 0 ? (
                      <p className="text-center py-6 text-slate-400 text-xs font-medium">Chưa có khoản tiết kiệm nào</p>
                    ) : (
                      combinedSavings.map(item => {
                        const isNearMaturity = item.maturityDate && 
                          (new Date(item.maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 7 &&
                          (new Date(item.maturityDate).getTime() - new Date().getTime()) >= 0;
                        
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => { setSelectedTrackerItem(item); setTrackerItemType('SAVINGS'); }}
                            className={cn(
                              "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5",
                              isNearMaturity 
                                ? "bg-yellow-50/70 border-yellow-250 hover:bg-yellow-50 hover:shadow-sm" 
                                : "bg-white border-slate-150 hover:border-slate-250 hover:shadow-sm"
                            )}
                          >
                            <div className="space-y-1 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-800 truncate">{item.category}</span>
                                {isNearMaturity && (
                                  <span className="text-[8px] font-bold bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded border border-yellow-250 uppercase tracking-wider animate-pulse">
                                    Sắp đáo hạn
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 font-medium">
                                <span>Gửi: {item.date}</span>
                                {item.maturityDate && <span>Đáo hạn: {item.maturityDate}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-black text-blue-600">{Number(item.amount).toLocaleString('vi-VN')}đ</p>
                              <span className="text-[9px] text-slate-400 font-bold hover:underline hover:text-blue-600">Tất toán →</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 2. DEBTS SUB-TAB */}
                {activeTrackerTab === 'DEBTS' && (
                  <div className="space-y-4">
                    {/* Group A: Receivables */}
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Người khác nợ mình</p>
                      <div className="space-y-2">
                        {combinedDebts.filter(d => d.isReceivable).length === 0 ? (
                          <p className="text-center py-2 text-slate-350 text-[10px] italic">Không có khoản phải thu</p>
                        ) : (
                          combinedDebts.filter(d => d.isReceivable).map(item => (
                            <div 
                              key={item.id} 
                              onClick={() => { setSelectedTrackerItem(item); setTrackerItemType('DEBT'); }}
                              className="flex items-center justify-between p-3 bg-white border border-slate-150 hover:border-slate-250 rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-sm"
                            >
                              <div className="space-y-1 min-w-0 pr-2">
                                <span className="font-bold text-xs text-slate-800 block truncate">{item.partner}</span>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  <span>Hạn: {item.due_date}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-emerald-600">+{Number(item.amount).toLocaleString('vi-VN')}đ</p>
                                <span className="text-[9px] text-slate-400 font-bold hover:underline hover:text-emerald-600">Thu hồi →</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Group B: Payables */}
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mình nợ người khác</p>
                      <div className="space-y-2">
                        {combinedDebts.filter(d => !d.isReceivable).length === 0 ? (
                          <p className="text-center py-2 text-slate-350 text-[10px] italic">Không có khoản nợ phải trả</p>
                        ) : (
                          combinedDebts.filter(d => !d.isReceivable).map(item => (
                            <div 
                              key={item.id} 
                              onClick={() => { setSelectedTrackerItem(item); setTrackerItemType('DEBT'); }}
                              className="flex items-center justify-between p-3 bg-white border border-slate-150 hover:border-slate-250 rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-sm"
                            >
                              <div className="space-y-1 min-w-0 pr-2">
                                <span className="font-bold text-xs text-slate-800 block truncate">{item.category}</span>
                                <div className="text-[10px] text-slate-400 font-medium">
                                  <span>Hạn: {item.due_date}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-red-500">-{Number(item.amount).toLocaleString('vi-VN')}đ</p>
                                <span className="text-[9px] text-slate-400 font-bold hover:underline hover:text-red-500">Trả nợ →</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. INVESTMENTS SUB-TAB */}
                {activeTrackerTab === 'INVESTMENTS' && (
                  <div className="space-y-3">
                    {combinedInvestments.length === 0 ? (
                      <p className="text-center py-6 text-slate-400 text-xs font-medium">Chưa có khoản đầu tư nào</p>
                    ) : (
                      combinedInvestments.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => { setSelectedTrackerItem(item); setTrackerItemType('INVESTMENT'); }}
                          className="flex items-center justify-between p-3.5 bg-white border border-slate-150 hover:border-slate-250 rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-sm"
                        >
                          <div className="space-y-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-800 truncate">{item.category}</span>
                              <span className="text-[8px] font-bold bg-amber-50 text-amber-700 px-1 py-0.5 rounded border border-amber-100 uppercase tracking-wider">
                                {item.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              <span>Ngày mua: {item.date}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-amber-600">{Number(item.amount).toLocaleString('vi-VN')}đ</p>
                            <span className="text-[9px] text-slate-400 font-bold hover:underline hover:text-amber-650">Bán →</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>

      {editingTx && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setEditingTx(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Chỉnh sửa giao dịch</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingTx.category || editingTx.type}
                </p>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số tiền</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full text-2xl font-bold border-b-2 border-slate-200 focus:border-blue-600 focus:outline-none py-2 bg-transparent text-right pr-8 transition-colors"
                    autoFocus
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">₫</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ngày</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ghi chú</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  placeholder="Không bắt buộc"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingTx(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleEditSave}
                disabled={isSavingEdit}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[999] bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 animate-in fade-in slide-in-from-bottom duration-305 max-w-md">
          {toastType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* TRACKER DETAIL MODALS */}
      {selectedTrackerItem && trackerItemType === 'SAVINGS' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={() => setSelectedTrackerItem(null)}>
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-lg">🏦 Chi tiết khoản Tiết kiệm</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Savings Account</p>
              </div>
              <button onClick={() => setSelectedTrackerItem(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                <div className="flex justify-between">
                  <span>Nơi gửi:</span>
                  <span className="text-slate-900 font-bold">{selectedTrackerItem.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số tiền gốc:</span>
                  <span className="text-blue-600 font-black">{Number(selectedTrackerItem.amount).toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày gửi:</span>
                  <span className="text-slate-800">{selectedTrackerItem.date}</span>
                </div>
                {selectedTrackerItem.term && (
                  <div className="flex justify-between">
                    <span>Kỳ hạn:</span>
                    <span className="text-slate-800">{selectedTrackerItem.term}</span>
                  </div>
                )}
                {selectedTrackerItem.maturityDate && (
                  <div className="flex justify-between">
                    <span>Ngày đáo hạn:</span>
                    <span className="text-slate-800">{selectedTrackerItem.maturityDate}</span>
                  </div>
                )}
                {selectedTrackerItem.note && (
                  <div className="border-t border-slate-200/55 pt-2 mt-2">
                    <span className="text-slate-400 block text-[10px] uppercase">Ghi chú</span>
                    <span className="text-slate-700 italic">"{selectedTrackerItem.note}"</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Số tiền thực nhận (VND)</label>
                <input 
                  type="number"
                  placeholder={selectedTrackerItem.amount.toString()}
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-bold text-slate-800 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedTrackerItem(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors">
                Hủy bỏ
              </button>
              <button 
                onClick={() => handleResolveSaving(selectedTrackerItem)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Đáo hạn / Rút về
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTrackerItem && trackerItemType === 'DEBT' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={() => setSelectedTrackerItem(null)}>
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  {selectedTrackerItem.isReceivable ? "💸 Chi tiết khoản Cho vay" : "💳 Chi tiết khoản Đi vay"}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Debt Records</p>
              </div>
              <button onClick={() => setSelectedTrackerItem(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                <div className="flex justify-between">
                  <span>Đối tượng:</span>
                  <span className="text-slate-900 font-bold">{selectedTrackerItem.partner}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số tiền:</span>
                  <span className={cn("font-black", selectedTrackerItem.isReceivable ? "text-emerald-600" : "text-red-500")}>
                    {Number(selectedTrackerItem.amount).toLocaleString('vi-VN')}₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày phát sinh:</span>
                  <span className="text-slate-800">{selectedTrackerItem.date}</span>
                </div>
                {selectedTrackerItem.due_date && (
                  <div className="flex justify-between">
                    <span>Hạn thanh toán:</span>
                    <span className="text-slate-800">{selectedTrackerItem.due_date}</span>
                  </div>
                )}
                {selectedTrackerItem.note && (
                  <div className="border-t border-slate-200/55 pt-2 mt-2">
                    <span className="text-slate-400 block text-[10px] uppercase">Ghi chú</span>
                    <span className="text-slate-700 italic">"{selectedTrackerItem.note}"</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedTrackerItem(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors">
                Hủy bỏ
              </button>
              <button 
                onClick={() => handleResolveDebt(selectedTrackerItem)}
                className={cn(
                  "flex-1 py-3 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer",
                  selectedTrackerItem.isReceivable 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" 
                    : "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                )}
              >
                {selectedTrackerItem.isReceivable ? "Đã thu hồi nợ" : "Đã thanh toán nợ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTrackerItem && trackerItemType === 'INVESTMENT' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={() => setSelectedTrackerItem(null)}>
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-lg">📈 Chi tiết khoản Đầu tư</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Investment Asset</p>
              </div>
              <button onClick={() => setSelectedTrackerItem(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                <div className="flex justify-between">
                  <span>Tên/Loại tài sản:</span>
                  <span className="text-slate-900 font-bold">{selectedTrackerItem.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giá trị mua (Cost Basis):</span>
                  <span className="text-amber-600 font-black">{Number(selectedTrackerItem.amount).toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày đầu tư:</span>
                  <span className="text-slate-800">{selectedTrackerItem.date}</span>
                </div>
                {selectedTrackerItem.note && (
                  <div className="border-t border-slate-200/55 pt-2 mt-2">
                    <span className="text-slate-400 block text-[10px] uppercase">Ghi chú</span>
                    <span className="text-slate-700 italic">"{selectedTrackerItem.note}"</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Giá trị bán thực tế (VND)</label>
                <input 
                  type="number"
                  placeholder={selectedTrackerItem.amount.toString()}
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 font-bold text-slate-800 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setSelectedTrackerItem(null); setActionAmount(''); }} className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors">
                Hủy bỏ
              </button>
              <button 
                onClick={() => handleResolveInvestment(selectedTrackerItem)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Đã bán tài sản
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
