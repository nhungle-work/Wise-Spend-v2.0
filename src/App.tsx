/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Activation } from './pages/Activation';
import { Onboarding } from './pages/Onboarding';
import { Record } from './pages/Record';
import { Sources } from './pages/Sources';
import { Tracker } from './pages/Tracker';
import { Overview } from './pages/Overview';
import { Security } from './pages/Security';

function ProtectedRoute() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500 font-bold">ĐANG TẢI...</div>;

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/activation" element={<Activation />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/record" replace />} />
            <Route path="/dashboard" element={<Navigate to="/record" replace />} />
            <Route path="/record" element={<Record />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/security" element={<Security />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
