'use client';

import { Save, Loader2 } from 'lucide-react';
import './DetailDrawerShell.css';

export default function DrawerActionBar({
  hint = 'Unsaved changes',
  error,
  onCancel,
  cancelLabel = 'Cancel',
  onSave,
  saveLabel = 'Save Changes',
  saving = false,
  saveDisabled = false,
}) {
  return (
    <div className="drawer-action-bar">
      <div className="drawer-action-bar-left">
        <span className="drawer-unsaved-pill">{hint}</span>
        {error && <span className="drawer-action-error">{error}</span>}
      </div>
      <div className="drawer-action-bar-right">
        {onCancel && (
          <button
            type="button"
            className="btn-secondary drawer-action-cancel"
            onClick={onCancel}
            disabled={saving}
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          className="drawer-save-btn"
          onClick={onSave}
          disabled={saving || saveDisabled}
        >
          {saving ? <Loader2 size={15} className="drawer-save-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  );
}
