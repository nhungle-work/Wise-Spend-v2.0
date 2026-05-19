import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

type CheckState = 'loading' | 'no_sheet' | 'no_onboarding' | 'ready';

export function Layout() {
  const [state, setState] = useState<CheckState>('loading');
  const location = useLocation();

  useEffect(() => {
    const check = async () => {
      setState('loading');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState('no_sheet'); return; }

      if (!session.user.user_metadata?.sheet_url) { setState('no_sheet'); return; }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('onboarding_completed')
        .eq('user_id', session.user.id)
        .single();

      if (!settings?.onboarding_completed) { setState('no_onboarding'); return; }

      setState('ready');
    };
    check();
  }, [location.pathname]);

  if (state === 'loading') {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500 font-bold">ĐANG KIỂM TRA DỮ LIỆU...</div>;
  }

  if (state === 'no_sheet')      return <Navigate to="/activation"  replace />;
  if (state === 'no_onboarding') return <Navigate to="/onboarding"  replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
