import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Field } from "../components/Field";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grain grid min-h-screen place-items-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/logo.jpeg" alt="Arena Brasil" className="size-20 rounded-[24px] object-cover shadow-lg ring-4 ring-white" />
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
            Arena <span className="text-brand-gradient">Brasil</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Painel de gestão das quadras</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-7">
          <Field label="E-mail" htmlFor="email">
            <input id="email" type="email" autoComplete="email" required autoFocus className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@arena.com" />
          </Field>
          <Field label="Senha" htmlFor="password">
            <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="brand" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
