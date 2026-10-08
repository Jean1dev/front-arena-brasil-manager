import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "brand" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90",
  brand: "bg-brand-gradient text-white shadow-[0_8px_20px_-8px_rgba(20,150,205,0.7)] hover:brightness-105",
  ghost: "bg-white text-ink ring-1 ring-sand-200 hover:bg-sand-50",
  danger: "bg-danger text-white hover:bg-danger/90",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  size?: "md" | "sm";
}

export function Button({ variant = "primary", loading, size = "md", className = "", children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.97] disabled:opacity-50 ${
        size === "md" ? "h-11 px-5 text-sm" : "h-9 px-4 text-[13px]"
      } ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
