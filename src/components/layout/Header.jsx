import React from 'react';
import { useStore } from '../../store/useStore';
import { Moon, Sun, User, Bell } from 'lucide-react';
import RoleSelector from './RoleSelector';
import './Header.css';

const Header = () => {
  const { theme, toggleTheme, userRole } = useStore();

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="page-title">ECWC P&E System</h2>
      </div>

      <div className="header-right">
        <RoleSelector />

        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button className="icon-btn">
          <Bell size={20} />
        </button>

        <div className="user-profile">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="user-name">John Doe</span>
            <span className="user-role">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
