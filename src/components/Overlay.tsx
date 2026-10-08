import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

function Header({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-sand-200 px-6 py-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      <button onClick={onClose} aria-label="Fechar" className="grid size-9 shrink-0 place-items-center rounded-full bg-sand-100 hover:bg-sand-200">
        <X className="size-4" />
      </button>
    </div>
  );
}

const backdrop = (onClose: () => void) => (
  <motion.div
    key="backdrop"
    className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  />
);

/** Painel lateral à direita, para formulários longos. */
export function Drawer({ open, onClose, title, subtitle, children, footer }: Props) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && [
        backdrop(onClose),
        <motion.aside
          key="drawer"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-y-0 right-0 z-50 flex w-[640px] max-w-full flex-col bg-sand-50 shadow-2xl"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
        >
          <Header title={title} subtitle={subtitle} onClose={onClose} />
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-sand-200 bg-white px-6 py-4">{footer}</div>}
        </motion.aside>,
      ]}
    </AnimatePresence>
  );
}

/** Diálogo central, para formulários curtos e confirmações. */
export function Modal({ open, onClose, title, subtitle, children, footer }: Props) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && [
        backdrop(onClose),
        <div key="modal" className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-6">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="pointer-events-auto w-[480px] max-w-full overflow-hidden rounded-[28px] bg-sand-50 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
          >
            <Header title={title} subtitle={subtitle} onClose={onClose} />
            <div className="px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-sand-200 bg-white px-6 py-4">{footer}</div>}
          </motion.div>
        </div>,
      ]}
    </AnimatePresence>
  );
}
