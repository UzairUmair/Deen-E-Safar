"use client";
// Small shared pieces for application screens: toasts, loading, error and empty states.
import { createContext, useContext, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "../../lib/apiClient";

/** Shows a short status message. Screens only call it after the action really happened. */
export const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function Skeleton({ className = "", lines = 1 }: { className?: string; lines?: number }) {
  return (
    <span className={`skeleton ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

export function LoadingState({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="loading-state">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const { t } = useTranslation();
  return (
    <div className="state-card error-state" role="alert">
      <h3>{title ?? t("This content could not be loaded")}</h3>
      <p>{t(apiErrorMessage(error))}</p>
      {onRetry && (
        <button type="button" className="btn secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" />
          {t("Try again")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state-card empty-state">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PageHeading({ eyebrow, title, children, aside }: { eyebrow: string; title: string; children?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="feature-heading">{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {aside}
    </header>
  );
}
