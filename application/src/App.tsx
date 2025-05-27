import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Dashboard from './Dashboard';
import CharacterGeneratorPage from './CharacterGeneratorPage'; // Import the new page
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Import routing components

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

// Helper for protected routes
const ProtectedRoute = ({ session, children }: { session: Session | null, children: JSX.Element }) => {
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

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
    return <div>Loading...</div>; // Or a MUI spinner
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/auth" 
            element={!session ? <Auth /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute session={session}>
                <Dashboard onSignOut={async () => { 
                  await supabase.auth.signOut(); 
                  // No need to setSession(null) here, onAuthStateChange will handle it.
                  // Navigating to /auth after signout might be handled by ProtectedRoute or explicitly.
                }} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/character-generator" 
            element={
              <ProtectedRoute session={session}>
                <CharacterGeneratorPage />
              </ProtectedRoute>
            } 
          />
          {/* Add a catch-all or redirect for unknown paths if desired */}
          <Route path="*" element={<Navigate to={session ? "/" : "/auth"} replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
