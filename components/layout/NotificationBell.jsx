'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import './NotificationBell.css';

const POLL_MS = 30000;

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const router = useRouter();
  const { canReceiveGarageNotifications } = usePermissions();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!canReceiveGarageNotifications) return;
    try {
      const data = await apiFetch('/api/notifications');
      setNotifications(data);
    } catch {
      /* ignore poll errors */
    }
  }, [canReceiveGarageNotifications]);

  useEffect(() => {
    loadNotifications();
    if (!canReceiveGarageNotifications) return undefined;
    const interval = setInterval(loadNotifications, POLL_MS);
    return () => clearInterval(interval);
  }, [loadNotifications, canReceiveGarageNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!canReceiveGarageNotifications) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await apiFetch(`/api/notifications/${notification.id}/read`, { method: 'POST' });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
        );
      } catch {
        /* continue navigation */
      }
    }
    setOpen(false);
    if (notification.vehicleId) {
      router.push(`/garage?vehicle=${notification.vehicleId}`);
    }
  };

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className={`icon-btn notification-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <span>Notifications</span>
            {unreadCount > 0 && <span className="notification-unread-count">{unreadCount} new</span>}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="notification-empty">No notifications yet.</p>
            ) : notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(n)}
              >
                <CheckCircle2 size={16} className="notification-item-icon" />
                <div className="notification-item-body">
                  <p className="notification-message">{n.message}</p>
                  <span className="notification-time">{formatTime(n.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
