import React, { useState } from 'react';
import { supabase } from './supabaseClient';

type AuthView = 'sign-in' | 'sign-up';

export default function Auth() {
  const [view, setView] = useState<AuthView>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let result;
    if (view === 'sign-in') {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }
    if (result.error) setError(result.error.message);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#faf9f6',
      overflow: 'auto'
    }}>
      <form
        onSubmit={handleAuth}
        className="paper-container"
      >
        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>
          {view === 'sign-in' ? 'Sign In' : 'Sign Up'}
        </h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        />
        {error && (
          <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: 'none',
            background: '#222',
            color: '#fff',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : (view === 'sign-in' ? 'Sign In' : 'Sign Up')}
        </button>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          {view === 'sign-in' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setView('sign-up')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0070f3',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setView('sign-in')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0070f3',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}