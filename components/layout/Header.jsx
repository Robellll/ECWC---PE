'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useStore } from '@/store/useStore';
import { Moon, Sun, User, LogOut } from 'lucide-react';
import NotificationBell from './NotificationBell';
import './Header.css';

const Header = () => {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({ redirect: false });
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ecwc-theme');
    if (saved === 'dark') {
      document.body.classList.add('dark-theme');
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }, [theme]);

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="page-title">ECWC P&E System</h2>
      </div>

      <div className="header-right">
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <NotificationBell />

        <div className="user-profile">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="user-name">{session?.user?.name || 'User'}</span>
            <span className="user-role">{session?.user?.roleLabel || ''}</span>
          </div>
        </div>

        <button
          className="icon-btn"
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
