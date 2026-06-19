import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

/**
 * Provides app-wide, non-blocking toast notifications and a styled async confirm
 * dialog — replacing the jarring native alert()/window.confirm() popups.
 *
 * Usage:
 *   const { toast, confirm } = useToast();
 *   toast('Saved!', 'success');
 *   if (await confirm({ title: 'Delete?', message: '...', danger: true })) { ... }
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);
  const resolverRef = useRef(null);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success', duration = 2800) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const confirm = useCallback((opts) => {
    const config = typeof opts === 'string' ? { message: opts } : (opts || {});
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: config.title || 'Are you sure?',
        message: config.message || '',
        confirmLabel: config.confirmLabel || 'Confirm',
        cancelLabel: config.cancelLabel || 'Cancel',
        danger: !!config.danger,
      });
    });
  }, []);

  const closeDialog = useCallback((result) => {
    setDialog(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const ICONS = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      <div className={styles.toastStack}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`${styles.toast} ${styles[t.type] || ''}`} role="status">
              <Icon size={18} className={styles.toastIcon} />
              <span className={styles.toastMsg}>{t.message}</span>
              <button className={styles.toastClose} onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {dialog && (
        <div className={styles.confirmOverlay} onClick={() => closeDialog(false)}>
          <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.confirmIcon} ${dialog.danger ? styles.confirmIconDanger : ''}`}>
              <AlertTriangle size={22} />
            </div>
            <h3 className={styles.confirmTitle}>{dialog.title}</h3>
            {dialog.message && <p className={styles.confirmMsg}>{dialog.message}</p>}
            <div className={styles.confirmActions}>
              <button className="btn btn--secondary" onClick={() => closeDialog(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                className={`btn ${dialog.danger ? 'btn--danger' : 'btn--primary'}`}
                onClick={() => closeDialog(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback so the app never crashes if a component renders outside the provider.
    return {
      toast: (msg) => console.log('[toast]', msg),
      confirm: (opts) => Promise.resolve(window.confirm(typeof opts === 'string' ? opts : opts?.message || 'Are you sure?')),
    };
  }
  return ctx;
}
