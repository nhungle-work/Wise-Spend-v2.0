import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Wallet, 
  PenLine, 
  CalendarDays, 
  LayoutDashboard, 
  Shield,
  Plus,
  Settings,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Sidebar() {
  const navItems = [
    { name: 'Số dư hiện tại', path: '/sources', icon: Wallet },
    { name: 'Monthly Tracker & Planner', path: '/tracker', icon: CalendarDays },
    { name: 'Ghi chép', path: '/record', icon: PenLine },
    { name: 'Tổng quan', path: '/overview', icon: LayoutDashboard },
    { name: 'Bảo mật', path: '/security', icon: Shield },
  ];

  return (
    <aside className="w-64 fixed left-0 top-0 bottom-0 bg-white border-r border-slate-200 flex flex-col z-50">
      <div className="px-6 py-8">
        <h1 className="text-xl font-black text-blue-600">WiseSpend</h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 opacity-80">
          Finance Manager
        </p>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all',
                isActive
                  ? 'text-blue-700 bg-blue-50 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 font-medium'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  isActive ? "border-l-4 border-blue-600 h-full absolute left-0" : "hidden"
                )} />
                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-500")} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}

        <div className="mt-4 px-2">
          <button className="w-full bg-blue-600 text-white rounded-lg py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-sm hover:bg-blue-700 active:scale-95 transition-all">
            <Plus className="w-5 h-5" />
            Thêm giao dịch
          </button>
        </div>
      </nav>

      <div className="mt-auto px-2 pb-6 pt-4 border-t border-slate-200">
        <NavLink
            to="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-all font-medium"
        >
            <Settings className="w-5 h-5 text-slate-500" />
            <span>Cài đặt</span>
        </NavLink>
        <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-all font-medium"
        >
            <LogOut className="w-5 h-5 text-slate-500" />
            <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
