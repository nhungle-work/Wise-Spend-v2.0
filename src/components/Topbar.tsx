import { Search, Bell, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function Topbar() {
  const location = useLocation();
  
  // A crude way to map path to title for the topbar, 
  // since tracking state perfectly across files here is overkill.
  const getTitle = () => {
    switch (location.pathname) {
      case '/sources': return 'Số dư hiện tại';
      case '/record': return 'Ghi chép';
      case '/tracker': return ''; // Tracker has specific custom header content
      case '/overview': return 'Tổng quan tài chính';
      default: return 'WiseSpend';
    }
  };

  const title = getTitle();

  // If we are on Tracker page, it has a custom inline header in the design,
  // but to keep it simple, we might just hide the common topbar or let the page define it.
  // For now, we'll keep a common topbar structure and adjust per page content.

  return (
    <header className="h-16 px-8 flex items-center justify-between sticky top-0 z-40 bg-app-bg/80 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold text-blue-700">{title}</h2>
        {location.pathname === '/record' && (
          <div className="relative group hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm giao dịch..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden bg-white">
          <img 
            src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0" 
            alt="User avatar" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
