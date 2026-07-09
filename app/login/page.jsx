'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLoader from '@/components/ui/AppLoader';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="login-page">
      {loading && (
        <div className="login-loading-overlay">
          <AppLoader label="Signing in…" variant="fullscreen" />
        </div>
      )}
      <div className="login-card">
        <img src="/logo.png.png" alt="ECWC Logo" className="login-logo" />
        <h1>ECWC Plant & Equipment</h1>
        <p className="login-subtitle">Sign in to your account</p>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="your.email@ecwc.gov.et"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
