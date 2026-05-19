import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSheetRows } from '../lib/googleSheets';
import { 
  Building2, 
  Wallet, 
  Banknote, 
  TrendingUp, 
  CreditCard,
  UserSearch,
  Info,
  ArrowDownLeft,
  PieChart,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Overview() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [historyTxs, setHistoryTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const loadOverviewData = async () => {
      setLoading(true);
      try {
        const [txs, walletsData] = await Promise.all([
          getSheetRows("Transaction").catch(() => []),
          getSheetRows("Wallets").catch(() => [])
        ]);

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
        console.error("Error loading overview data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  // 1. Wallets base sums
  const parsedWallets = wallets.map(w => {
    const isCredit = w.type === 'credit' || w.name.startsWith('[Credit]');
    const cleanName = w.name.startsWith('[Credit]') ? w.name.replace('[Credit]', '').trim() : w.name;
    return { ...w, isCredit, cleanName };
  });

  const baseBank = parsedWallets.filter(w => w.type === 'bank' && !w.isCredit).reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const baseEwallet = parsedWallets.filter(w => w.type === 'ewallet' && !w.isCredit).reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const baseCash = parsedWallets.filter(w => w.type === 'cash' && !w.isCredit).slice(0, 1).reduce((sum, w) => sum + (w.balance_snapshot || 0), 0);
  const totalBaseWallets = baseBank + baseEwallet + baseCash;
  const creditCards = parsedWallets.filter(w => w.isCredit);

  // 2. Transactions sums from Google Sheet
  const totalIncome = historyTxs.filter(t => t.type === 'THU').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = historyTxs.filter(t => t.type === 'CHI').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalSavings = historyTxs.filter(t => t.type === 'TIẾT KIỆM').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalInvestment = historyTxs.filter(t => t.type === 'ĐẦU TƯ').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalDebt = historyTxs.filter(t => t.type === 'VAY / NỢ').reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // 3. Dynamic aggregates
  const currentBalance = totalBaseWallets + totalIncome - totalExpense - totalSavings - totalInvestment;
  const netWorth = currentBalance + totalSavings + totalInvestment - totalDebt;

  const totalAssets = currentBalance + totalSavings + totalInvestment;
  const savingsRate = totalIncome > 0 ? (((totalSavings + totalInvestment) / totalIncome) * 100).toFixed(1) : "0.0";
  
  // Average monthly (using 1 for current if simple)
  const averageMonthlySpent = totalExpense;

  const savingsPerc = totalAssets > 0 ? Math.round((totalSavings / totalAssets) * 100) : 0;
  const investmentPerc = totalAssets > 0 ? Math.round((totalInvestment / totalAssets) * 100) : 0;
  const balancePerc = totalAssets > 0 ? Math.round((currentBalance / totalAssets) * 100) : 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {loading ? (
        <div className="py-24 text-center text-sm font-bold text-slate-400">Đang tải báo cáo tổng quan...</div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          
          {/* Row 1 */}
          <section className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-6 relative">
            
            {/* Net Worth Card */}
            <div className="col-span-2 md:col-span-1 bg-white border-l-4 border-blue-600 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tài sản ròng (Net Worth)</span>
                <Building2 className="w-6 h-6 text-blue-600/30" />
              </div>
              <div className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                {netWorth.toLocaleString('vi-VN')} <span className="text-lg font-medium text-slate-500 tracking-normal">VND</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-slate-500 font-medium text-xs">
                <span>Tính từ tổng tài sản trừ nợ phải trả</span>
              </div>
            </div>

            {/* Current Balance Card */}
            <div className="col-span-2 md:col-span-1 bg-white border-l-4 border-purple-600 p-8 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Số dư hiện tại</span>
                <button className="text-purple-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline bg-purple-50 px-2 py-1 rounded">
                  Chi tiết <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <div className="text-4xl font-black text-slate-900 mb-6">
                {currentBalance.toLocaleString('vi-VN')} <span className="text-lg font-medium text-slate-500">VND</span>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-slate-100">
                 <div className="flex justify-between text-xs font-medium">
                   <span className="flex items-center gap-2 text-slate-600"><Building2 className="w-4 h-4" /> Ngân hàng</span>
                   <span className="font-bold text-slate-800">{baseBank.toLocaleString('vi-VN')}</span>
                 </div>
                 <div className="flex justify-between text-xs font-medium">
                   <span className="flex items-center gap-2 text-slate-600"><Wallet className="w-4 h-4" /> Ví điện tử</span>
                   <span className="font-bold text-slate-800">{baseEwallet.toLocaleString('vi-VN')}</span>
                 </div>
                 <div className="flex justify-between text-xs font-medium">
                   <span className="flex items-center gap-2 text-slate-600"><Banknote className="w-4 h-4" /> Tiền mặt</span>
                   <span className="font-bold text-slate-900">{baseCash.toLocaleString('vi-VN')}</span>
                 </div>
              </div>
            </div>

          </section>

          {/* Annual report */}
          <section className="col-span-12 lg:col-span-4 bg-slate-50 p-8 rounded-2xl border border-slate-200">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-8 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-blue-600" />
               Báo cáo năm {currentYear}
             </h3>
             <div className="space-y-8">
               <div>
                 <p className="text-xs font-medium text-slate-500 mb-1">Tổng thu nhập năm</p>
                 <p className="text-2xl font-black text-emerald-600">{totalIncome.toLocaleString('vi-VN')} <span className="text-sm">VND</span></p>
               </div>
               <div>
                 <p className="text-xs font-medium text-slate-500 mb-1">Tổng chi tiêu năm</p>
                 <p className="text-2xl font-black text-red-500">{totalExpense.toLocaleString('vi-VN')} <span className="text-sm">VND</span></p>
               </div>
               
               <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
                 <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Trung bình tháng</p>
                    <p className="text-lg font-bold text-slate-900">
                      {averageMonthlySpent > 0 ? `${(averageMonthlySpent / 1000000).toFixed(1)}M` : "0đ"}
                    </p>
                 </div>
                 <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Tỷ lệ tiết kiệm</p>
                    <p className="text-lg font-bold text-blue-600">{savingsRate}%</p>
                 </div>
               </div>
             </div>
          </section>

          {/* Row 2 */}
          
          {/* Savings and Investments */}
          <section className="col-span-12 md:col-span-6 lg:col-span-4 bg-white p-8 rounded-2xl shadow-sm border-l-4 border-orange-500 flex flex-col">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Tiết kiệm &amp; Đầu tư</h3>
               <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded">Thời gian thực</span>
             </div>
             
             <div className="space-y-6 flex-1">
               <div className="flex items-center gap-4">
                 <div className="w-1.5 h-12 bg-emerald-500 rounded-full" />
                 <div className="flex-1">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tiết kiệm (Savings)</p>
                   <p className="text-base font-black text-slate-900">{totalSavings.toLocaleString('vi-VN')} đ</p>
                 </div>
                 <div className="text-right"><p className="text-sm font-medium text-slate-500">{savingsPerc}%</p></div>
               </div>

               <div className="flex items-center gap-4">
                 <div className="w-1.5 h-12 bg-blue-600 rounded-full" />
                 <div className="flex-1">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Đầu tư (Investments)</p>
                   <p className="text-base font-black text-slate-900">{totalInvestment.toLocaleString('vi-VN')} đ</p>
                 </div>
                 <div className="text-right"><p className="text-sm font-medium text-slate-500">{investmentPerc}%</p></div>
               </div>
               
               <div className="flex items-center gap-4">
                 <div className="w-1.5 h-12 bg-purple-500 rounded-full" />
                 <div className="flex-1">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Số dư khả dụng</p>
                   <p className="text-base font-black text-slate-900">{currentBalance.toLocaleString('vi-VN')} đ</p>
                 </div>
                 <div className="text-right"><p className="text-sm font-medium text-slate-500">{balancePerc}%</p></div>
               </div>
             </div>

             <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-end">
               <div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng tài sản tích lũy</p>
                 <p className="text-2xl font-black text-slate-900">{totalAssets.toLocaleString('vi-VN')}</p>
               </div>
               <PieChart className="w-8 h-8 text-slate-200" />
             </div>
          </section>

          {/* Debts & Credits */}
          <section className="col-span-12 md:col-span-6 lg:col-span-4 bg-white p-8 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider">Tổng nợ phải trả</h3>
               <ChevronDown className="w-5 h-5 text-slate-400" />
             </div>

              <div className="space-y-4 flex-1">
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 flex justify-between items-center">
                  <div>
                     <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-0.5">DƯ NỢ GHI NHẬN</p>
                     <p className="text-base font-black text-slate-900">{totalDebt.toLocaleString('vi-VN')} đ</p>
                  </div>
                  <CreditCard className="w-5 h-5 text-red-300" />
                </div>
                
                {creditCards.map(cc => (
                  <div key={cc.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs font-semibold text-slate-700 animate-in fade-in slide-in-from-top-1">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-red-500" />
                      {cc.cleanName}
                    </span>
                    <span className="font-bold text-slate-500 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Thẻ tín dụng</span>
                  </div>
                ))}
                
                {totalDebt === 0 && creditCards.length === 0 && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400 font-bold">
                    Tuyệt vời! Bạn không có khoản nợ nào.
                  </div>
                )}
              </div>

             <div className="mt-8 pt-6 border-t border-slate-100">
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dư nợ cần thanh toán</p>
               <div className="flex justify-between items-baseline">
                 <p className="text-2xl font-black text-red-500">{totalDebt.toLocaleString('vi-VN')} đ</p>
                 <p className="text-xs font-bold text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                   Hạn thanh toán hàng tháng <Info className="w-3 h-3" />
                 </p>
               </div>
             </div>
          </section>

          {/* Goals & Receivables */}
          <section className="col-span-12 lg:col-span-4 flex flex-col gap-6">
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex-1">
               <div className="flex justify-between items-center mb-6">
                 <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tình hình tài chính tổng thể</p>
                 <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">
                   {netWorth > 0 ? "Khỏe mạnh" : "Cần lưu ý"}
                 </span>
               </div>
               <p className="text-xs text-slate-500 leading-relaxed font-medium">
                 {netWorth > 0 
                   ? "Bạn đang kiểm soát tốt tài chính cá nhân. Giá trị tài sản ròng lớn hơn các khoản nợ của bạn." 
                   : "Hãy chú ý chi tiêu và hạn chế phát sinh các khoản nợ mới để giữ tài sản ròng ở mức an toàn."}
               </p>
             </div>

             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex-1">
               <div className="flex justify-between items-center mb-6">
                 <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mục tiêu tích lũy tổng tài sản</p>
                 <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">
                   {totalAssets > 0 ? "Bắt đầu" : "0%"}
                 </span>
               </div>
               <div className="w-full bg-slate-100 h-4 rounded-full mb-4 overflow-hidden relative">
                 <div className="absolute top-0 left-0 h-full w-[2%] bg-blue-600 rounded-full" />
               </div>
               <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                 <span>Đang tích lũy: {totalAssets.toLocaleString('vi-VN')}</span>
                 <span>Tiến trình thực tế</span>
               </div>
             </div>
          </section>

        </div>
      )}
    </div>
  );
}
