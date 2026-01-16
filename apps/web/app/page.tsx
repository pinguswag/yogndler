'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import LoginPage from '@/components/LoginPage';
import App from '@/components/App';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 font-black text-sm uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <App />;
}
