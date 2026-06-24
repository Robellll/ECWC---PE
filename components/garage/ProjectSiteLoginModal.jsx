'use client';

import { useState, useEffect } from 'react';
import { X, Key, Copy, Check, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { defaultSiteEmail, defaultSiteDisplayName } from '@/lib/project-site-login';
import './ProjectSiteLoginModal.css';

const ProjectSiteLoginModal = ({ project, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [siteLogin, setSiteLogin] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(`/api/project-garage/${project.id}/site-login`);
        if (cancelled) return;
        setSiteLogin(data);
        setEmail(data.email || defaultSiteEmail(project.name));
        setName(data.user?.name || defaultSiteDisplayName(project.name));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load site login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [project.id, project.name]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch(`/api/project-garage/${project.id}/site-login`, {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      setSiteLogin(data);
      setSuccess(data.message || 'Site login saved.');
      setPassword('');
      setConfirmPassword('');
      onSaved?.(data);
    } catch (err) {
      setError(err.message || 'Could not save site login');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm('Disable site login for this project? Staff will not be able to sign in until you set a new password.')) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const data = await apiFetch(`/api/project-garage/${project.id}/site-login`, { method: 'DELETE' });
      setSiteLogin(data);
      setSuccess(data.message || 'Site login disabled.');
      onSaved?.(data);
    } catch (err) {
      setError(err.message || 'Could not disable site login');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content pg-site-login-modal" role="dialog" aria-modal="true">
        <div className="pg-site-login-header">
          <div>
            <h2><Key size={18} /> Project Site Login</h2>
            <p className="pg-site-login-sub">{project.name}</p>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {loading ? (
          <p className="page-subtitle">Loading…</p>
        ) : (
          <>
            <div className={`pg-site-status ${siteLogin?.enabled ? 'active' : 'inactive'}`}>
              {siteLogin?.enabled ? 'Site login active' : 'No active site login'}
              {siteLogin?.user && (
                <span className="pg-site-status-meta">Last updated {new Date(siteLogin.user.updatedAt).toLocaleDateString('en-GB')}</span>
              )}
            </div>

            <p className="pg-site-login-hint">
              Create one shared login per project for site staff. When personnel change, set a new password — the email stays the same.
            </p>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Login email</label>
                <div className="pg-email-row">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="garage.project-name@ecwc.gov.et"
                  />
                  <button type="button" className="btn-secondary pg-copy-btn" onClick={handleCopyEmail} title="Copy email">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Display name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project site garage account"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{siteLogin?.user ? 'New password' : 'Password'}</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && <p className="pg-site-error"><AlertCircle size={14} /> {error}</p>}
              {success && <p className="pg-site-success">{success}</p>}

              <div className="modal-actions">
                {siteLogin?.enabled && (
                  <button type="button" className="btn-secondary pg-disable-btn" onClick={handleDisable} disabled={saving}>
                    Disable
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : siteLogin?.user ? 'Update Password' : 'Create Site Login'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectSiteLoginModal;
