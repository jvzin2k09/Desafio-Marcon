"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Package, ClipboardList, History, BarChart3, Undo2, Boxes, Menu, X, Recycle } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import SplashScreen from "@/components/SplashScreen";
import KineticGrid from "@/components/ui/kinetic-grid";

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
    navItems.push({ href: "/painel-estoque", icon: Boxes, label: "Monitor Estoque" });
    navItems.push({ href: "/estoque-alternativo", icon: Recycle, label: "Estoque Alt." });
    navItems.push({ href: "/historico", icon: History, label: "Histórico" });
  }
  if (role === "ADMIN") {
    navItems.push({ href: "/painel-estoque", icon: Boxes, label: "Monitor Estoque" });
    navItems.push({ href: "/estoque-alternativo", icon: Recycle, label: "Estoque Alt." });
    navItems.push({ href: "/solicitante", icon: Package, label: "Novo Pedido" });
    navItems.push({ href: "/almoxarifado", icon: ClipboardList, label: "Fila de Pedidos" });
    navItems.push({ href: "/historico", icon: History, label: "Histórico" });
  }

  const roleBadge = {
    ADMIN: { label: "Administrador", color: "#7c3aed" },
    ALMOXARIFE: { label: "Almoxarife", color: "#1B3A6B" },
    OPERADOR: { label: "Operador", color: "#16a34a" },
  }[role] || { label: role, color: "#64748b" };

  const [showMobileLogout, setShowMobileLogout] = useState(false);

  // Filtramos o "Dashboard" apenas para o menu inferior móvel e definimos a ordem exata
  const mobileOrder = ["/almoxarifado", "/estoque-alternativo", "/solicitante", "/painel-estoque", "/historico"];
  const mobileNavItems = navItems
    .filter(item => item.label !== "Dashboard")
    .sort((a, b) => {
      const idxA = mobileOrder.indexOf(a.href);
      const idxB = mobileOrder.indexOf(b.href);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

  return (
    <>
      <SplashScreen />
      <KineticGrid>
      <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "transparent" }}>
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 bg-white lg:bg-[#161618]/85 lg:backdrop-blur-md border-r border-[var(--border)] lg:border-white/10 flex-col shrink-0 min-h-screen transition-colors">
        {/* Logo */}
        <div className="p-5 border-b border-[var(--border)] lg:border-white/10 flex items-center gap-3">
          <Image src="/Logo.png" alt="Til Marcon" width={240} height={72} className="h-14 w-auto object-contain lg:brightness-0 lg:invert" priority />
        </div>

        {/* Nav */}
        <div className="p-3 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 lg:text-slate-400 px-3 mb-2">Navegação</p>
          <nav className="space-y-0.5 mb-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${isActive
                      ? "bg-[var(--surface-3)] text-[var(--primary)] font-bold lg:bg-blue-600/20 lg:text-blue-400 lg:border lg:border-blue-500/30"
                      : "text-slate-600 hover:bg-[var(--surface-2)] hover:text-slate-900 lg:text-slate-300 hover:lg:text-white hover:lg:bg-white/5"
                    }`}
                >
                  <item.icon className="w-[18px] h-[18px]" style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 hidden lg:block">GESTÃO & ANALYTICS</p>
          <nav className="space-y-0.5 hidden lg:block">
            <Link
              href="/indicadores"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${pathname === "/indicadores"
                  ? "bg-[var(--surface-3)] text-[var(--primary)] font-bold lg:bg-blue-600/20 lg:text-blue-400 lg:border lg:border-blue-500/30"
                  : "text-slate-600 hover:bg-[var(--surface-2)] hover:text-slate-900 lg:text-slate-300 hover:lg:text-white hover:lg:bg-white/5"
                }`}
            >
              <BarChart3 className="w-[18px] h-[18px]" style={{ color: pathname === "/indicadores" ? "var(--primary)" : "var(--text-muted)" }} />
              Indicadores & Gráficos
            </Link>
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-[var(--border)] lg:border-white/10 lg:bg-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--primary)" }}>
              {session.user.name?.charAt(0)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-slate-800 lg:text-slate-200 truncate">{session.user.name}</p>
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm" style={{ background: roleBadge.color + "15", color: roleBadge.color }}>
                {roleBadge.label}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 lg:text-red-400 hover:bg-red-50 hover:lg:bg-red-500/10 rounded-lg transition-colors font-bold text-xs uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-40 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <Image src="/Logo.png" alt="Til Marcon" width={240} height={72} className="h-14 w-auto object-contain" priority />
        </div>
        <div className="flex items-center gap-3 relative">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setShowMobileLogout(!showMobileLogout)}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ background: "var(--primary)" }}>
              {roleBadge.label.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 leading-tight max-w-[120px] truncate">{roleBadge.label}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{roleBadge.label}</span>
            </div>
          </div>
          {showMobileLogout && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[100px] z-50">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors font-bold text-xs uppercase tracking-wider"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pb-28 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex items-center justify-around py-2 px-1 md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.08)] pb-safe" style={{ borderColor: "var(--border)" }}>
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          
          let compactLabel = item.label;
          if (item.label.includes("Monitor")) compactLabel = "Estoque";
          if (item.label.includes("Alt.")) compactLabel = "Sobras";
          if (item.label.includes("Novo")) compactLabel = "Novo";
          if (item.label.includes("Fila")) compactLabel = "Pedidos";

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 min-w-0 gap-1 text-center transition-all px-1"
            >
              <div
                className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${isActive
                    ? "bg-[var(--primary)] text-white shadow-md scale-110"
                    : "text-slate-500 hover:text-slate-800 bg-transparent"
                  }`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] leading-tight truncate w-full mt-0.5 ${isActive ? "text-[var(--primary)] font-bold" : "text-slate-500 font-medium"
                  }`}
              >
                {compactLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
    </KineticGrid>
    </>
  );
}
