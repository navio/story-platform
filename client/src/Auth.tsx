import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  CircularProgress
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

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
    <Box
      minHeight="100vh"
      width="100vw"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="#faf9f6"
      overflow="auto"
    >
      <Paper
        elevation={4}
        sx={{
          p: 4,
          minWidth: { xs: '90vw', sm: 400 },
          maxWidth: 400,
          borderRadius: 3,
          boxShadow: 3,
        }}
        component="form"
        onSubmit={handleAuth}
      >
        <Typography variant="h5" align="center" mb={2} fontWeight={600}>
          {view === 'sign-in' ? 'Sign In' : 'Sign Up'}
        </Typography>
        <TextField
          type="email"
          label="Email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          autoComplete="email"
        />
        <TextField
          type="password"
          label="Password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
          fullWidth
          margin="normal"
          autoComplete="current-password"
        />
        {error && (
          <Typography color="error" align="center" mt={1} mb={1}>
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ py: 1.5, fontWeight: 600, mt: 1 }}
          disabled={loading}
          endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Loading...' : (view === 'sign-in' ? 'Sign In' : 'Sign Up')}
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          fullWidth
          startIcon={<GoogleIcon />}
          sx={{ py: 1.5, fontWeight: 600, mt: 2, mb: 1, borderColor: '#4285F4', color: '#4285F4', '&:hover': { borderColor: '#4285F4', background: '#f5faff' } }}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              // Debug: log the redirect URL in production
              console.log("OAuth redirectTo:", window.location.origin);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
              });
              if (error) setError(error.message);
            } catch (err: any) {
              setError(err.message);
            }
            setLoading(false);
          }}
          disabled={loading}
        >
          Sign in with Google
        </Button>
        <Box mt={2} textAlign="center">
          {view === 'sign-in' ? (
            <>
              <Typography variant="body2" component="span">
                Don't have an account?{' '}
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={() => setView('sign-up')}
                sx={{ textDecoration: 'underline', color: 'primary.main' }}
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Typography variant="body2" component="span">
                Already have an account?{' '}
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={() => setView('sign-in')}
                sx={{ textDecoration: 'underline', color: 'primary.main' }}
              >
                Sign In
              </Link>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}