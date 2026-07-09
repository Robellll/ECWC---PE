'use client';

import { useState, useEffect, useMemo } from 'react';
import { Key, Copy, Check, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import AppModal, { FormField } from '@/components/ui/AppModal';
import AppLoader from '@/components/ui/AppLoader';
import {
  GARAGE_SITE_LOGIN_CONFIG,
  EQUIPMENT_SITE_LOGIN_CONFIG,
} from '@/lib/project-site-login';
import './ProjectSiteLoginModal.css';

const CONFIG_BY_MODULE = {
  garage: GARAGE_SITE_LOGIN_CONFIG,
  equipment: EQUIPMENT_SITE_LOGIN_CONFIG,
};

const ProjectSiteLoginModal = ({ project, onClose, onSaved, module = 'garage' }) => {
  const config = useMemo(
    () => CONFIG_BY_MODULE[module] || GARAGE_SITE_LOGIN_CONFIG,
    [module],
  );

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

  const apiPath = `${config.apiBase}/${project.id}/site-login`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(apiPath);
        if (cancelled) return;
        setSiteLogin(data);
        setEmail(data.email || config.defaultEmail(project.name));
        setName(data.user?.name || config.defaultDisplayName(project.name));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load site login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiPath, config, project.id, project.name]);

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
      const data = await apiFetch(apiPath, {
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
      const data = await apiFetch(apiPath, { method: 'DELETE' });
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
    <AppModal
      open
      title={config.title}
      subtitle={project.name}
      titleIcon={<Key size={18} />}
      onClose={onClose}
      onSubmit={handleSave}
      submitLabel={saving ? 'Saving…' : siteLogin?.user ? 'Update Password' : 'Create Site Login'}
      submitDisabled={saving || loading}
      noForm={loading}
      footer={loading ? null : undefined}
      actionsStart={siteLogin?.enabled ? (
        <button type="button" className="btn-secondary pg-disable-btn" onClick={handleDisable} disabled={saving}>
          Disable
        </button>
      ) : null}
      contentClassName="pg-site-login-modal"
      large
    >
      {loading ? (
        <AppLoader label="Loading site login…" variant="inline" />
      ) : (
        <>
          <div className={`pg-site-status ${siteLogin?.enabled ? 'active' : 'inactive'}`}>
            {siteLogin?.enabled ? 'Site login active' : 'No active site login'}
            {siteLogin?.user && (
              <span className="pg-site-status-meta">Last updated {new Date(siteLogin.user.updatedAt).toLocaleDateString('en-GB')}</span>
            )}
          </div>

          <p className="pg-site-login-hint">{config.hint}</p>

          <div className="production-form-grid">
            <FormField label="Login email" full>
              <div className="pg-email-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={config.emailPlaceholder}
                />
                <button type="button" className="btn-secondary pg-copy-btn" onClick={handleCopyEmail} title="Copy email">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </FormField>
            <FormField label="Display name" full>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={config.displayNamePlaceholder}
              />
            </FormField>
            <FormField label={siteLogin?.user ? 'New password' : 'Password'}>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirm password">
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </FormField>
          </div>

          {error && <p className="pg-site-error"><AlertCircle size={14} /> {error}</p>}
          {success && <p className="pg-site-success">{success}</p>}
        </>
      )}
    </AppModal>
  );
};

export default ProjectSiteLoginModal;
