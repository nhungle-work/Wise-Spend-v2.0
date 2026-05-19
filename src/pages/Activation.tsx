import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Copy, CheckCircle2, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export function Activation() {
  const [sheetId, setSheetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const serviceAccountEmail = "wisespend@feisty-mason-477203-h9.iam.gserviceaccount.com";
  const templateLink = "https://docs.google.com/spreadsheets/d/1iIVGBnNoqVgX7L12DfJmAh26DCEc67DXZUUArgjPw_I/copy";

  useEffect(() => {
    const checkExisting = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.user_metadata?.sheet_url) {
        navigate('/record'); // already onboarded
      }
    };
    checkExisting();
  }, [navigate]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetId.trim()) return setError("Vui lòng nhập Link hoặc ID Google Sheet");
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Chưa đăng nhập");

      let finalId = sheetId.trim();
      if (finalId.includes("docs.google.com/spreadsheets/d/")) {
        const match = finalId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) finalId = match[1];
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { sheet_url: finalId }
      });
      if (updateError) throw updateError;

      // Force session refresh to ensure the access token immediately contains the new sheet_url metadata claim
      await supabase.auth.refreshSession().catch((e) => console.warn("Failed to refresh session:", e));

      // Compatibility fallback: write to user_sheets table so old deployed Edge Functions can resolve the sheet
      try {
        await supabase.from('user_sheets').upsert(
          { user_id: session.user.id, sheet_id: finalId },
          { onConflict: 'user_id' }
        );
      } catch (dbErr) {
        console.warn("Could not write to user_sheets fallback table:", dbErr);
      }

      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <header className="fixed top-0 left-0 right-0 py-4 px-8 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-50">
        <div className="text-xl font-black text-blue-600">WiseSpend</div>
        <button
          onClick={() => supabase.auth.signOut().then(() => navigate('/auth'))}
          className="text-xs font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider transition-colors"
        >
          Đăng xuất
        </button>
      </header>

      <main className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xl mt-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl mb-5">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Kết nối Google Sheet của bạn</h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-lg mx-auto">
            Dữ liệu tài chính được lưu trong Google Sheet <strong className="text-slate-700">của chính bạn</strong> — bạn luôn sở hữu và kiểm soát toàn bộ dữ liệu.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center text-sm">1</div>
            <div className="space-y-3 flex-1">
              <h3 className="font-bold text-slate-900">Tạo bản sao Google Sheet mẫu</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Nhấn nút dưới để copy template của WiseSpend. File đã có sẵn tab <strong className="text-slate-700">Transactions</strong> và <strong className="text-slate-700">Categories</strong> được format đúng chuẩn.
              </p>
              <a
                href={templateLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all rounded-xl text-sm font-bold shadow-sm shadow-blue-600/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Tạo bản sao Google Sheet
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center text-sm">2</div>
            <div className="space-y-3 flex-1">
              <h3 className="font-bold text-slate-900">Cấp quyền cho Robot đồng bộ</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Mở Sheet vừa tạo → nhấn <strong className="text-slate-700">Share</strong> → dán email bên dưới → chọn quyền <strong className="text-slate-700">Editor</strong>.
              </p>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
                <code className="flex-1 text-xs px-4 py-3 text-slate-700 font-mono break-all leading-relaxed">
                  {serviceAccountEmail}
                </code>
                <button
                  onClick={handleCopyEmail}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-l border-slate-200 transition-all shrink-0 whitespace-nowrap",
                    copied ? "text-emerald-600 bg-emerald-50" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  )}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Đã chép!" : "Copy email"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center text-sm">3</div>
            <div className="space-y-3 flex-1">
              <h3 className="font-bold text-slate-900">Dán link Google Sheet của bạn</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Copy URL của file Google Sheet vừa tạo và dán vào ô bên dưới để hoàn tất kết nối.
              </p>

              <form onSubmit={handleSave} className="space-y-3">
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />

                {error && (
                  <p className="text-xs text-red-500 font-medium bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                    ⚠️ {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !sheetId.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all",
                    loading || !sheetId.trim()
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98]"
                  )}
                >
                  {loading ? "ĐANG KẾT NỐI..." : (
                    <><span>HOÀN TẤT KẾT NỐI</span> <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-6 flex items-center gap-2 text-slate-400">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-xs font-medium">Dữ liệu không đi qua server của chúng tôi</span>
      </footer>
    </div>
  );
}
