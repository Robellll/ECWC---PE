import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import {
  Shield,
  User,
  Briefcase,
  ClipboardList,
  FileText,
  Wrench,
  Hammer,
  ChevronDown,
  Check,
  Search,
  ShieldAlert
} from 'lucide-react';
import './RoleSelector.css';

const ROLES = [
  {
    id: 'Super Admin',
    name: 'Super Admin',
    shortName: 'Super Admin',
    level: 0,
    icon: Shield,
    color: '#eab308', // Amber
    desc: 'Full access & customization control'
  },
  {
    id: '1. CEO',
    name: '1. CEO',
    shortName: 'CEO',
    level: 0,
    icon: User,
    color: '#3b82f6', // Blue
    desc: 'Chief Executive Officer (Read-only)'
  },
  {
    id: '1.1 Plant & Equipment Manager',
    name: '1.1 Plant & Equipment Manager',
    shortName: 'P&E Manager',
    level: 1,
    icon: Briefcase,
    color: '#10b981', // Emerald
    desc: 'P&E Department overall management'
  },
  {
    id: '1.1.1 Plant & Equipment Administration',
    name: '1.1.1 Plant & Equipment Administration',
    shortName: 'P&E Admin',
    level: 2,
    icon: ClipboardList,
    color: '#8b5cf6', // Violet
    desc: 'Central P&E administrative controls'
  },
  {
    id: '1.1.1.1 Project Plant & Equipment Administration',
    name: '1.1.1.1 Project Plant & Equipment Administration',
    shortName: 'Proj P&E Admin',
    level: 3,
    icon: FileText,
    color: '#ec4899', // Pink
    desc: 'Project-level P&E administration'
  },
  {
    id: '1.1.2 Plant & Equipment Maintenance',
    name: '1.1.2 Plant & Equipment Maintenance',
    shortName: 'P&E Maintenance',
    level: 2,
    icon: Wrench,
    color: '#f97316', // Orange
    desc: 'Central maintenance & workshop editor'
  },
  {
    id: '1.1.2.1 Project Plant & Equipment Maintenance',
    name: '1.1.2.1 Project Plant & Equipment Maintenance',
    shortName: 'Proj P&E Maintenance',
    level: 3,
    icon: Hammer,
    color: '#ef4444', // Red
    desc: 'Project maintenance & workshop operator'
  },
  {
    id: '1.1.3 Insurance Officer',
    name: '1.1.3 Insurance Officer',
    shortName: 'Insurance Officer',
    level: 2,
    icon: ShieldAlert,
    color: '#06b6d4', // Cyan
    desc: 'Insurance claim & accident log editor'
  }
];

const RoleSelector = () => {
  const { userRole, setUserRole } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeRole = ROLES.find(r => r.id === userRole) || ROLES[0];
  const ActiveIcon = activeRole.icon;

  const filteredRoles = ROLES.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="role-dropdown-container" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        className="role-dropdown-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        aria-expanded={isOpen}
      >
        <div className="role-trigger-content">
          <div className="role-trigger-icon-wrapper" style={{ backgroundColor: `${activeRole.color}15`, color: activeRole.color }}>
            <ActiveIcon size={16} />
          </div>
          <div className="role-trigger-text">
            <span className="role-trigger-label">Active Persona</span>
            <span className="role-trigger-val" title={activeRole.name}>{activeRole.shortName}</span>
          </div>
        </div>
        <ChevronDown size={16} className={`role-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {/* Dropdown Options Portal/Menu */}
      {isOpen && (
        <div className="role-dropdown-menu">
          <div className="role-search-container">
            <Search size={14} className="role-search-icon" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="role-search-input"
              autoFocus
            />
          </div>

          <div className="role-options-list">
            {filteredRoles.length === 0 ? (
              <div className="role-no-results">No roles found</div>
            ) : (
              filteredRoles.map((role) => {
                const RoleIcon = role.icon;
                const isSelected = role.id === userRole;
                
                // Construct hierarchical tree prefix
                let treePrefix = '';
                if (!searchQuery) {
                  if (role.level === 1) {
                    treePrefix = '├── ';
                  } else if (role.level === 2) {
                    // Check if it's the last child under level 1
                    const isLastLevel2 = role.id.includes('1.1.3');
                    treePrefix = isLastLevel2 ? '│   └── ' : '│   ├── ';
                  } else if (role.level === 3) {
                    const isLastLevel3 = role.id.includes('1.1.2.1');
                    treePrefix = isLastLevel3 ? '│       └── ' : '│   │   └── ';
                  }
                }

                return (
                  <button
                    key={role.id}
                    className={`role-option-item level-${role.level} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setUserRole(role.id);
                      setIsOpen(false);
                    }}
                  >
                    {treePrefix && (
                      <span className="role-tree-prefix">{treePrefix}</span>
                    )}
                    <div
                      className="role-item-icon-wrapper"
                      style={{ backgroundColor: `${role.color}15`, color: role.color }}
                    >
                      <RoleIcon size={14} />
                    </div>
                    <div className="role-item-info">
                      <div className="role-item-name-row">
                        <span className="role-item-name">{role.name}</span>
                        {isSelected && <Check size={14} className="role-check-icon" />}
                      </div>
                      <span className="role-item-desc">{role.desc}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelector;
