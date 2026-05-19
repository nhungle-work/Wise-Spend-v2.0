import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Info, 
  Landmark, 
  MoreVertical, 
  Wallet, 
  Banknote, 
  CreditCard,
  Plus,
  X,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { getSheetRows, appendRow, updateRow, deleteRow } from '../lib/googleSheets';

export function Sources() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedType, setSelectedType] = useState<'bank' | 'ewallet' | 'cash' | 'credit'>('bank');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [originalBalance, setOriginalBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation prompt for resetting balance
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      // Tự động dọn dẹp (xóa) dữ liệu ví cũ trên Supabase để tránh rác database
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('wallets').delete().eq('user_id', session.user.id);
      }

      const rows = await getSheetRows("Wallets").catch(() => []);
      if (!rows || rows.length === 0) {
        const walletHeaders = ["Ví ID", "Tên tài khoản", "Loại", "Số dư", "Cập nhật cuối"];
        await appendRow("Wallets", walletHeaders).catch((e) => console.warn("Failed to write wallet headers:", e));
      } else if (rows[0][0] === "id" || rows[0][0] === "name") {
        const walletHeaders = ["Ví ID", "Tên tài khoản", "Loại", "Số dư", "Cập nhật cuối"];
        await updateRow("Wallets", 1, walletHeaders).catch((e) => console.warn("Failed to upgrade wallet headers:", e));
      }

      const freshRows = await getSheetRows("Wallets").catch(() => []);
      if (freshRows && freshRows.length > 1) {
        const formatted = freshRows.slice(1).map((r: any, idx: number) => ({
          id: r[0],
          name: r[1],
          type: r[2],
          balance_snapshot: Number(r[3] || 0),
          updated_at: r[4],
          rowNumber: idx + 2
        })).filter((w: any) => w.id);
        setWallets(formatted);
      } else {
        setWallets([]);
      }
    } catch (err) {
      console.error("Error fetching wallets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const getWalletIcon = (name: string) => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes('vietcombank') || lowercase.includes('vcb')) {
      return <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Vietcombank_logo.svg/2048px-Vietcombank_logo.svg.png" className="w-full h-full object-contain" alt="VCB" />;
    }
    if (lowercase.includes('techcombank') || lowercase.includes('tcb')) {
      return <img src="https://logowik.com/content/uploads/images/techcombank-new-20241026.logowik.com.webp" className="w-full h-full object-contain" alt="TCB" />;
    }
    if (lowercase.includes('momo')) {
      return <span className="text-white font-black text-xs">MoMo</span>;
    }
    if (lowercase.includes('zalopay') || lowercase.includes('zalo')) {
      return <span className="text-white font-black text-xs">Zalo</span>;
    }
    return null;
  };

  // Helper to check if name is credit card or uses prefix
  const parseWallet = (w: any) => {
    const isCredit = w.type === 'credit' || w.name.startsWith('[Credit]');
    const cleanName = w.name.startsWith('[Credit]') ? w.name.replace('[Credit]', '').trim() : w.name;
    return {
      ...w,
      isCredit,
      cleanName
    };
  };

  const parsedWallets = wallets.map(parseWallet);

  const bankAccounts = parsedWallets.filter(w => w.type === 'bank' && !w.isCredit);
  const ewallets = parsedWallets.filter(w => w.type === 'ewallet' && !w.isCredit);
  const rawCashWallets = parsedWallets.filter(w => w.type === 'cash' && !w.isCredit);
  const cashWallets = rawCashWallets.slice(0, 1);
  const creditCards = parsedWallets.filter(w => w.isCredit);

  const cashListToRender = cashWallets.length > 0 ? cashWallets : [{ id: 'default-cash', cleanName: 'Tiền mặt', type: 'cash', balance_snapshot: 0, isCredit: false, isDefaultMock: true }];

  const sumBank = bankAccounts.reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const sumEwallet = ewallets.reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const sumCash = cashWallets.reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const totalAssets = sumBank + sumEwallet + sumCash;

  // Modal open helpers
  const openAddModal = (type: 'bank' | 'ewallet' | 'cash' | 'credit') => {
    setModalMode('add');
    setSelectedType(type);
    setWalletId(null);
    setWalletName('');
    setWalletBalance('0');
    setOriginalBalance('0');
    setError(null);
    setShowResetConfirm(false);
    setIsOpenModal(true);
  };

  const openEditModal = (w: any) => {
    if (w.isDefaultMock) {
      setModalMode('add');
      setSelectedType('cash');
      setWalletId(null);
      setWalletName('Tiền mặt');
      setWalletBalance('0');
      setOriginalBalance('0');
      setError(null);
      setShowResetConfirm(false);
      setIsOpenModal(true);
      return;
    }
    setModalMode('edit');
    setSelectedType(w.isCredit ? 'credit' : w.type);
    setWalletId(w.id);
    setWalletName(w.cleanName);
    setWalletBalance(w.balance_snapshot.toString());
    setOriginalBalance(w.balance_snapshot.toString());
    setError(null);
    setShowResetConfirm(false);
    setIsOpenModal(true);
  };

  // Save validations
  const handlePreSave = () => {
    let finalName = walletName.trim();
    if (selectedType === 'cash') {
      finalName = "Tiền mặt";
    }

    if (!finalName && selectedType !== 'cash') {
      setError("Vui lòng nhập tên tài khoản/ví.");
      return;
    }

    const balanceNum = Number(walletBalance.replace(/\D/g, '')) || 0;
    const origNum = Number(originalBalance) || 0;

    // Show reset confirm warning if modifying balance of existing owned source
    if (modalMode === 'edit' && selectedType !== 'credit' && balanceNum !== origNum) {
      setShowResetConfirm(true);
    } else {
      handleSave(balanceNum);
    }
  };

  const handleSave = async (balanceNum: number) => {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Chưa đăng nhập");

      let finalName = selectedType === 'cash' ? "Tiền mặt" : walletName.trim();
      let walletType = selectedType;

      const existingWallet = wallets.find(w => w.id === walletId);
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (modalMode === 'edit' && existingWallet && existingWallet.rowNumber) {
        const row = [
          existingWallet.id,
          finalName,
          walletType,
          (walletType === 'credit' ? 0 : balanceNum).toString(),
          timestamp
        ];
        await updateRow("Wallets", existingWallet.rowNumber, row);
      } else {
        const newId = uuidv4();
        const row = [
          newId,
          finalName,
          walletType,
          (walletType === 'credit' ? 0 : balanceNum).toString(),
          timestamp
        ];
        await appendRow("Wallets", row);
      }

      setIsOpenModal(false);
      setShowResetConfirm(false);
      fetchWallets();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi lưu tài khoản/ví.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!walletId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${walletName}" không? Mọi giao dịch liên kết với tài khoản này vẫn được giữ lại nhưng số dư hiển thị sẽ bị xóa.`)) return;

    setSaving(true);
    setError(null);
    try {
      const existingWallet = wallets.find(w => w.id === walletId);
      if (existingWallet && existingWallet.rowNumber) {
        await deleteRow("Wallets", existingWallet.rowNumber);
      }
      setIsOpenModal(false);
      fetchWallets();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể xóa tài khoản/ví.");
    } finally {
      setSaving(false);
    }
  };

  const handleBalanceInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setWalletBalance(cleaned);
  };

  const formatDisplayMoney = (raw: string) => {
    if (!raw) return '0';
    return Number(raw).toLocaleString('vi-VN');
  };

  const POPULAR_BANKS = ['Vietcombank', 'Techcombank', 'VPBank', 'MB Bank', 'Timo', 'HSBC', 'VIB', 'BIDV', 'TPBank'];
  const POPULAR_EWALLETS = ['MoMo', 'ZaloPay', 'Viettel Money', 'Apple Pay'];

  return (
    <div className="p-8 max-w-[1280px] mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Top Summaries */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600 h-full">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tổng tài sản sở hữu</p>
            <p className="text-3xl font-black text-blue-600">
              {loading ? "..." : totalAssets.toLocaleString('vi-VN')} <span className="text-lg font-medium">₫</span>
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="col-span-12 lg:col-span-8 bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex gap-4 h-full items-center">
          <Info className="w-6 h-6 text-blue-600 shrink-0" />
          <div>
            <h4 className="font-bold text-sm text-blue-800 mb-1">Cơ chế Mốc Reset số dư</h4>
            <p className="text-xs text-blue-900/70 leading-relaxed font-medium">
              WiseSpend tự động cập nhật số dư sau mỗi giao dịch THU/CHI. Số dư chỉ được reset khi bạn chủ động chỉnh lại — con số bạn nhập sẽ là mốc mới để tính từ đó trở đi.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm font-bold text-slate-400">Đang tải số dư tài khoản...</div>
      ) : (
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Col - Banks */}
          <section className="col-span-12 lg:col-span-7 space-y-6">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Landmark className="w-6 h-6 text-blue-600" />
                Tài khoản ngân hàng
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                {bankAccounts.length} TÀI KHOẢN
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map(w => (
                <div key={w.id} onClick={() => openEditModal(w)} className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden", getWalletIcon(w.name) ? "p-1 bg-slate-50" : "bg-slate-50")}>
                      {getWalletIcon(w.name) || <Landmark className="w-5 h-5 text-slate-600" />}
                    </div>
                    <MoreVertical className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                  </div>
                  <h4 className="font-bold text-lg text-slate-800 mb-1">{w.cleanName}</h4>
                  <p className="text-3xl font-black text-blue-600 mb-2">
                    {Number(w.balance_snapshot || 0).toLocaleString('vi-VN')} <span className="text-lg font-medium">₫</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Mốc cập nhật: {new Date(w.updated_at || w.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ))}
              
              {/* Add Bank Card */}
              <button 
                onClick={() => openAddModal('bank')} 
                className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:bg-blue-50/50 transition-all group min-h-[170px] cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-2 group-hover:bg-blue-100 group-hover:border-blue-300 transition-colors">
                  <Plus className="w-5 h-5 group-hover:text-blue-600" />
                </div>
                <span className="font-bold text-sm group-hover:text-blue-700">Thêm tài khoản ngân hàng</span>
                <span className="text-xs opacity-70 mt-0.5">Mở rộng nguồn vốn sở hữu</span>
              </button>
            </div>

          </section>

          {/* Right Col - Ewallets & Cash */}
          <section className="col-span-12 lg:col-span-5 space-y-8">
             
             {/* Ewallets */}
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-purple-600" />
                    Ví điện tử
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                    {ewallets.length} VÍ
                  </span>
                </div>
                
                <div className="space-y-4">
                  {ewallets.map(w => (
                    <div key={w.id} onClick={() => openEditModal(w)} className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                      <div className="absolute top-0 left-0 w-1 h-full bg-purple-600" />
                      <div className="flex items-center gap-4">
                        <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden", w.name.toLowerCase().includes('momo') ? "bg-[#A50064]" : "bg-slate-50")}>
                          {getWalletIcon(w.name) || <Wallet className="w-6 h-6 text-purple-600" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-slate-800">{w.cleanName}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Cập nhật: {new Date(w.updated_at || w.created_at).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                          {Number(w.balance_snapshot || 0).toLocaleString('vi-VN')} <span className="text-base font-medium text-slate-500">₫</span>
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Add E-wallet button */}
                  <button 
                    onClick={() => openAddModal('ewallet')} 
                    className="w-full border-2 border-dashed border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 rounded-2xl p-4 flex items-center justify-center gap-2 text-slate-500 hover:text-purple-600 transition-all group cursor-pointer"
                  >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs group-hover:text-purple-700">Thêm ví điện tử mới</span>
                  </button>
                </div>
             </div>

             {/* Cash */}
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Banknote className="w-6 h-6 text-orange-600" />
                    Tiền mặt
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                    1 VÍ TIỀN MẶT
                  </span>
                </div>

                <div className="space-y-4">
                  {cashListToRender.map(w => (
                    <div key={w.id} onClick={() => openEditModal(w)} className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                      <div className="absolute top-0 left-0 w-1 h-full bg-orange-600" />
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                          <Wallet className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-slate-800">{w.cleanName}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">Sẵn sàng sử dụng</p>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                          {Number(w.balance_snapshot || 0).toLocaleString('vi-VN')} <span className="text-base font-medium text-slate-500">₫</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

          </section>

          {/* Full width - Credit Cards */}
          <section className="col-span-12 space-y-6 pt-4">
             <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2 text-red-600">
                <CreditCard className="w-6 h-6" />
                Thẻ tín dụng
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">CẦN THANH TOÁN DƯ NỢ</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {creditCards.map(w => (
                <div key={w.id} onClick={() => openEditModal(w)} className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm group hover:shadow-md transition-shadow cursor-pointer">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CreditCard className="w-32 h-32 text-red-500" />
                  </div>

                  <div className="flex justify-between items-start mb-8 relative z-10">
                     <div>
                       <h4 className="font-bold text-lg text-slate-900">{w.cleanName}</h4>
                       <p className="text-xs text-slate-500 font-medium">Thẻ tín dụng hoạt động</p>
                     </div>
                     <div className="italic font-black text-xl text-blue-900 tracking-tighter uppercase">VISA/MASTER</div>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hạn mức / Dư nợ</p>
                    <p className="text-2xl font-black text-slate-800">Theo chi tiêu thực tế</p>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between relative z-10 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Click để chỉnh sửa hoặc xóa</span>
                  </div>
                </div>
              ))}

              {/* Add Credit Card card button */}
              <button 
                onClick={() => openAddModal('credit')} 
                className="bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-red-500 hover:bg-red-50/50 transition-all group min-h-[200px] cursor-pointer"
              >
                 <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-red-100 transition-colors">
                   <Plus className="w-6 h-6 group-hover:text-red-600" />
                 </div>
                 <p className="font-bold text-sm group-hover:text-red-700">Thêm thẻ tín dụng</p>
                 <p className="text-xs mt-1 opacity-70">Quản lý dư nợ tập trung</p>
              </button>
            </div>
          </section>

        </div>
      )}

      {/* Modern Overlay Modal Form */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 transform scale-100 transition-all animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-xl">
                  {modalMode === 'add' ? 'Thêm tài khoản/ví mới' : 'Chỉnh sửa tài khoản/ví'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  WiseSpend • Cập nhật trực tiếp lên Cloud
                </p>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors border border-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Type Switcher (only editable in add mode) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Phân loại tài khoản/ví
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { type: 'bank', label: 'Ngân hàng', border: 'border-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
                    { type: 'ewallet', label: 'Ví điện tử', border: 'border-purple-600', text: 'text-purple-600', bg: 'bg-purple-50' },
                    { type: 'cash', label: 'Tiền mặt', border: 'border-orange-600', text: 'text-orange-600', bg: 'bg-orange-50' },
                    { type: 'credit', label: 'Thẻ tín dụng', border: 'border-red-600', text: 'text-red-600', bg: 'bg-red-50' }
                  ].filter(item => modalMode === 'edit' ? true : item.type !== 'cash').map(item => (
                    <button
                      key={item.type}
                      type="button"
                      disabled={modalMode === 'edit'}
                      onClick={() => {
                        setSelectedType(item.type as any);
                        if (item.type === 'credit') {
                          setWalletBalance('0');
                        }
                      }}
                      className={cn(
                        "py-2.5 px-2 rounded-xl text-[10px] font-bold text-center border-2 uppercase transition-all tracking-wider disabled:opacity-50",
                        selectedType === item.type 
                          ? `${item.border} ${item.text} ${item.bg}`
                          : "border-slate-200 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Field (Hidden for Cash) */}
              {selectedType !== 'cash' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Tên tài khoản / Ngân hàng
                  </label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={e => setWalletName(e.target.value)}
                    placeholder={
                      selectedType === 'bank' ? "VD: Vietcombank, Techcombank..." :
                      selectedType === 'ewallet' ? "VD: MoMo, ZaloPay..." :
                      selectedType === 'cash' ? "VD: Ví cá nhân, Tiền nhà..." :
                      "VD: VPBank Visa Signature, HSBC Cash Back..."
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    autoFocus
                  />

                  {/* Popular recommendations */}
                  {selectedType === 'bank' && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {POPULAR_BANKS.map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setWalletName(b)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedType === 'credit' && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {POPULAR_BANKS.map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setWalletName(`${b} Visa`)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedType === 'ewallet' && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {POPULAR_EWALLETS.map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWalletName(w)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600 transition-all cursor-pointer"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Balance (Only if not Credit Card) */}
              {selectedType !== 'credit' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Số dư hiện tại (Mốc reset)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDisplayMoney(walletBalance)}
                      onChange={e => handleBalanceInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-right text-blue-600"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₫</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    💡 Con số này sẽ thiết lập làm **mốc tính mới**. Giao dịch THU/CHI sau này sẽ được cộng/trừ trực tiếp từ con số này.
                  </p>
                </div>
              )}

              {/* Error messages */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
              {modalMode === 'edit' && selectedType !== 'cash' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              )}
              
              <div className="flex-1 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  disabled={saving}
                  className="px-5 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handlePreSave}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {saving ? 'Đang lưu...' : 'Lưu tài khoản/ví'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation reset point modal (Story 4) */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border border-slate-200 transform scale-100 transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Xác nhận thay đổi số dư</h4>
                <p className="text-xs text-slate-500 mt-1">Thiết lập mốc reset số dư mới</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Số dư tài khoản **{walletName}** sẽ được đặt lại thành **{formatDisplayMoney(walletBalance)}₫**. 
              <br /><br />
              Các giao dịch trước đó trong lịch sử **sẽ không bị ảnh hưởng**, nhưng số dư hiển thị của tài khoản này sẽ được tính toán kể từ mốc mới này trở đi.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Hủy quay lại
              </button>
              <button
                type="button"
                onClick={() => handleSave(Number(walletBalance) || 0)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              >
                Xác nhận mốc mới
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
