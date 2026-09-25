"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Package, ClipboardList, History, BarChart3, Undo2 } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";

export default function DashboardLayout({ children }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  if (!session) return null;

  const role = session.user.role;

  const navItems = [];

  if (role === "OPERADOR") {
    navItems.push({ href: "/solicitante", icon: Package, label: "Novo Pedido" });
  }
  if (role === "ALMOXARIFE") {
    navItems.push({ href: "/almoxarifado", icon: ClipboardList, label: "Fila de Pedidos" });
    navItems.push({ href: "/historico", icon: History, label: "Histórico" });
  }
  if (role === "ADMIN") {
    navItems.push({ href: "/admin", icon: BarChart3, label: "Dashboard" });
    navItems.push({ href: "/historico", icon: History, label: "Histórico" });
  }

  const roleBadge = {
    ADMIN: { label: "Administrador", color: "#7c3aed" },
    ALMOXARIFE: { label: "Almoxarife", color: "#1B3A6B" },
    OPERADOR: { label: "Operador", color: "#16a34a" },
  }[role] || { label: role, color: "#64748b" };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r flex flex-col" style={{ borderColor: "var(--border)" }}>
        {/* Logo */}
        <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
          <Image src="/Logo.png" alt="Til Marcon" width={160} height={48} className="h-10 w-auto object-contain" priority />
        </div>
        
        {/* Nav */}
        <div className="p-3 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-2">Navegação</p>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                    isActive
                      ? "bg-[var(--surface-3)] text-[var(--primary)] font-bold"
                      : "text-slate-600 hover:bg-[var(--surface-2)] hover:text-slate-900"
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px]" style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--primary)" }}>
              {session.user.name?.charAt(0)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{session.user.name}</p>
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm" style={{ background: roleBadge.color + "15", color: roleBadge.color }}>
                {roleBadge.label}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold text-xs uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
