import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ChatCircleDots, GraduationCap, ShareNetwork, SignOut, House,
} from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const NAV = [
  { to: "/app/chat", label: "Chat", icon: ChatCircleDots },
  { to: "/app/trilhas", label: "Trilhas", icon: GraduationCap },
  { to: "/app/indicar", label: "Indicar", icon: ShareNetwork },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#0A0A0A] text-white">
      {/* Side rail */}
      <aside
        className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-[#27272A] bg-[#0F0F10]"
        data-testid="app-sidebar"
      >
        <div className="p-5 border-b border-[#27272A]">
          <Logo />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`sidebar-link-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/30"
                      : "text-[#A1A1AA] hover:text-white hover:bg-white/5 border border-transparent"
                  }`
                }
              >
                <Icon size={18} weight="duotone" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#27272A]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#141414] border border-[#27272A]">
            <div className="w-9 h-9 rounded-full bg-[#FF4500]/20 border border-[#FF4500]/40 flex items-center justify-center font-bold text-sm text-[#FF4500]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-xs text-[#A1A1AA] truncate">{user?.email}</div>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <button
              data-testid="sidebar-home-btn"
              onClick={() => navigate("/")}
              className="flex-1 flex items-center justify-center gap-2 text-xs text-[#A1A1AA] hover:text-white py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <House size={14} /> Início
            </button>
            <button
              data-testid="sidebar-logout-btn"
              onClick={() => { logout(); navigate("/"); }}
              className="flex-1 flex items-center justify-center gap-2 text-xs text-[#A1A1AA] hover:text-[#EF4444] py-2 rounded-lg hover:bg-[#EF4444]/10 transition-colors"
            >
              <SignOut size={14} /> Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 glass border-b border-[#27272A] flex items-center justify-between px-4 h-14">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`mobile-link-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `p-2 rounded-lg ${isActive ? "text-[#FF4500] bg-[#FF4500]/10" : "text-[#A1A1AA]"}`
                }
              >
                <Icon size={18} weight="duotone" />
              </NavLink>
            );
          })}
          <button
            data-testid="mobile-logout-btn"
            onClick={() => { logout(); navigate("/"); }}
            className="p-2 rounded-lg text-[#A1A1AA]"
          >
            <SignOut size={18} />
          </button>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
