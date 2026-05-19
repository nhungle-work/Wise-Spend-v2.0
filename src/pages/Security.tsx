import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, 
  Key, 
  Database, 
  Mail, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Security() {
  const [email, setEmail] = useState('user@wisespend.com');
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1iIVGBnNoqVgX7L12DfJmAh26DCEc67DXZUUArgjPw_I/edit');
  const [loading, setLoading] = useState(false);
  
  // Password form state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // Sheet disconnect modal state
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectSuccess, setDisconnectSuccess] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email || 'user@wisespend.com');
        const rawUrl = session.user.user_metadata?.sheet_url;
        if (rawUrl) {
          if (rawUrl.includes("docs.google.com")) {
            setSheetUrl(rawUrl);
          } else {
            setSheetUrl(`https://docs.google.com/spreadsheets/d/${rawUrl}`);
          }
        }
      }
    };
    fetchUserData();
  }, []);

  // Shorten Google Sheet Url to show as https://docs.google.com/spreadsheets/d/...[id_part]
  const getShortenedUrl = (url: string) => {
    try {
      if (!url) return 'Chưa kết nối';
      const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const id = match[1];
        return `https://docs.google.com/spreadsheets/d/...${id.substring(0, 8)}...`;
      }
      return url.length > 45 ? `${url.substring(0, 42)}...` : url;
    } catch {
      return url;
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Vui lòng điền đầy đủ các trường.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải từ 8 ký tự trở lên.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    // Mock updating password (simulating API success)
    setTimeout(() => {
      setLoading(false);
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 3000);
    }, 1500);
  };

  const handleDisconnectSheet = () => {
    setLoading(true);
    // Mock disconnect sheet
    setTimeout(() => {
      setLoading(false);
      setDisconnectSuccess(true);
      setSheetUrl('Chưa kết nối');
      setTimeout(() => {
        setDisconnectSuccess(false);
        setShowDisconnectModal(false);
      }, 2500);
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
      
      {/* Header section with Glassmorphism accent */}
      <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Trung tâm Bảo mật</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Quản lý tài khoản cá nhân và quyền truy xuất cơ sở dữ liệu Google Sheet của bạn.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-2xl text-xs font-bold w-fit border border-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          DỮ LIỆU ĐƯỢC BẢO VỆ 100%
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* SECTION 1: USER ACCOUNT */}
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-3xl p-8 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Tài khoản &amp; Email</h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Account identity</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Địa chỉ Email</label>
                <input 
                  type="email" 
                  value={email}
                  readOnly 
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed select-all outline-none"
                />
              </div>

              {/* Password change form container */}
              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full py-3.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Đổi mật khẩu tài khoản
                </button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 animate-in slide-in-from-top duration-300">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Đặt mật khẩu mới</span>
                    <button 
                      type="button" 
                      onClick={() => { setShowPasswordForm(false); setPasswordError(null); }}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Old Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mật khẩu hiện tại</label>
                    <div className="relative">
                      <input 
                        type={showOldPass ? "text" : "password"} 
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mật khẩu mới (Tối thiểu 8 ký tự)</label>
                    <div className="relative">
                      <input 
                        type={showNewPass ? "text" : "password"} 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPass ? "text" : "password"} 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error & Success States */}
                  {passwordError && (
                    <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Mật khẩu của bạn đã được cập nhật thành công!</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => { setShowPasswordForm(false); setPasswordError(null); }}
                      className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Đang lưu...
                        </>
                      ) : "Cập nhật"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          <div className="mt-8 text-[11px] text-slate-400 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            🔒 Mật khẩu của bạn được mã hóa và bảo mật hoàn toàn bởi nhà cung cấp cơ sở hạ tầng xác thực Supabase Auth.
          </div>
        </div>

        {/* SECTION 2: GOOGLE SHEETS DATABASE */}
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-3xl p-8 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Database className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Cơ sở dữ liệu đám mây</h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Google Sheets Backend</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đường dẫn Google Sheet kết nối</label>
                  {sheetUrl !== 'Chưa kết nối' && (
                    <span className="flex items-center gap-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                      Hoạt động
                    </span>
                  )}
                </div>
                
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 flex items-center justify-between gap-2 overflow-hidden">
                  <span className={cn(
                    "text-xs font-semibold select-all break-all pr-2",
                    sheetUrl === 'Chưa kết nối' ? "text-slate-400 italic" : "text-slate-600"
                  )}>
                    {getShortenedUrl(sheetUrl)}
                  </span>
                  {sheetUrl !== 'Chưa kết nối' && (
                    <a 
                      href={sheetUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap bg-blue-50 px-2 py-1 rounded hover:bg-blue-100/80 transition-colors flex items-center gap-0.5"
                    >
                      Mở Sheet
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {sheetUrl !== 'Chưa kết nối' ? (
                <button
                  onClick={() => setShowDisconnectModal(true)}
                  className="w-full py-3.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 border border-red-200 hover:border-transparent"
                >
                  <Trash2 className="w-4 h-4" />
                  Ngắt kết nối Sheet
                </button>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl text-xs font-medium text-yellow-800">
                  ⚠️ Chưa kết nối file Google Sheet lưu trữ dữ liệu. Hãy cấu hình để WiseSpend hoạt động.
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 text-[11px] text-slate-400 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            ℹ️ Mọi giao dịch được ghi trên WiseSpend chỉ gửi trực tiếp về file này và không bao giờ lưu trữ trên máy chủ trung gian. Bạn sở hữu 100% dữ liệu.
          </div>
        </div>

      </div>

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base leading-snug">Xác nhận ngắt kết nối Sheet?</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Database Disconnect</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-medium">
              <p>
                Đổi hoặc ngắt kết nối Sheet đồng nghĩa dữ liệu cũ ở Sheet hiện tại sẽ <strong className="text-slate-800 font-bold">không còn hiển thị</strong> trong ứng dụng nữa.
              </p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-[11px] italic">
                💡 Lưu ý: Các giao dịch cũ của bạn <strong className="text-emerald-700 font-bold">không bị xóa đi</strong>, chúng vẫn an toàn tuyệt đối trong Google Drive cá nhân của bạn.
              </p>
              
              {disconnectSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl flex items-center gap-1.5 font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  Đã ngắt kết nối Google Sheet thành công!
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowDisconnectModal(false)}
                disabled={loading}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleDisconnectSheet}
                disabled={loading || disconnectSuccess}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : "Ngắt kết nối"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
