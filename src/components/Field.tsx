import type { ReactNode } from "react";

interface Props {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, htmlFor, children, className = "" }: Props) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>
      )}
    </div>
  );
}
