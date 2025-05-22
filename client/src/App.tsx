import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Dashboard from './Dashboard';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {session ? (
        <Dashboard onSignOut={async () => { await supabase.auth.signOut(); setSession(null); }} />
      ) : (
        <Auth />
      )}
    </ThemeProvider>
  );
}

export default App;
