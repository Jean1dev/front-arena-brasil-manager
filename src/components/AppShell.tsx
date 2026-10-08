import { CalendarDays, Clock, LandPlot, LogOut, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useMe } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

const NAV = [
  { to: "/", label: "Agenda", icon: CalendarDays, end: true },
  { to: "/mensalistas", label: "Mensalistas", icon: Users },
  { to: "/quadras", label: "Quadras", icon: LandPlot },
  { to: "/horarios", label: "Horários", icon: Clock },
];

export function AppShell() {
  const { logout } = useAuth();
  const { data: me } = useMe(true);

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-[260px] flex-col bg-ink text-white">
        <div className="flex items-center gap-3 px-6 pb-8 pt-7">
          <img src="/logo.jpeg" alt="" className="size-11 rounded-2xl object-cover ring-2 ring-white/15" />
          <div>
            <p className="text-base font-extrabold leading-tight tracking-tight">Arena Brasil</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-a">Gestão</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                  isActive ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-2xl bg-white/5 p-4">
          <p className="truncate text-sm font-bold">{me?.name ?? "…"}</p>
          <p className="truncate text-xs text-white/60">{me?.email}</p>
          <button
            onClick={logout}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-white/70 transition-colors hover:text-white"
          >
            <LogOut className="size-3.5" />
            Sair
          </button>
        </div>
      </aside>

      <main className="ml-[260px] flex-1 px-10 py-9">
        <div className="mx-auto max-w-[1280px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
