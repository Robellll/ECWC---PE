'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './AppModal.css';

export default function AppModal({
  open,
  title,
  subtitle,
  titleIcon,
  onClose,
  onSubmit,
  children,
  submitLabel = 'Save',
  submitDisabled = false,
  large = false,
  xl = false,
  footer,
  actionsStart,
  noForm = false,
  contentClassName = '',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const sizeClass = xl ? 'production-modal-xl' : large ? 'production-modal-lg' : '';
  const defaultFooter = (
    <div className="production-modal-actions">
      {actionsStart && <div className="production-modal-actions-start">{actionsStart}</div>}
      <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      <button type="submit" className="btn-primary" disabled={submitDisabled}>{submitLabel}</button>
    </div>
  );

  const actions = footer === null ? null : (footer ?? defaultFooter);

  const body = <div className="production-modal-body">{children}</div>;

  const dialog = (
    <div
      className={`production-modal-content ${sizeClass} ${contentClassName}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
    >
      <div className="production-modal-header">
        <div>
          <h2 id="app-modal-title">
            {titleIcon}
            {title}
          </h2>
          {subtitle && <p className="production-modal-subtitle">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="production-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {noForm ? (
        <>
          {body}
          {actions}
        </>
      ) : (
        <form className="production-modal-form" onSubmit={onSubmit}>
          {body}
          {actions}
        </form>
      )}
    </div>
  );

  return createPortal(
    <div
      className="production-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {dialog}
    </div>,
    document.body,
  );
}

export function FormField({ label, children, full }) {
  return (
    <div className={`production-form-group ${full ? 'form-group-full' : ''}`}>
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}
