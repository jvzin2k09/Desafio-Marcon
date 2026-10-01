"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Package, ClipboardList, History, BarChart3, Undo2, Boxes, Menu, X } from "lucide-react";
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
    navItems.push({ href: "/painel-estoque", icon: Boxes, label: "Monitor Estoque" });
    navItems.push({ href: "/historico", icon: History, label: "Histórico" });
  }
  if (role === "ADMIN") {
    navItems.push({ href: "/admin", icon: BarChart3, label: "Dashboard" });
    navItems.push({ href: "/painel-estoque", icon: Boxes, label: "Monitor Estoque" });
    navItems.push({ href: "/solicitante", icon: Package, label: "Novo Pedido" });
    navItems.push({ href: "/almoxarifado", icon: ClipboardList, label: "Fila de Pedidos" });
    navItems.push({ href: "/historico", icon: History, label: "Histórico" });
  }

  const roleBadge = {
    ADMIN: { label: "Administrador", color: "#7c3aed" },
    ALMOXARIFE: { label: "Almoxarife", color: "#1B3A6B" },
    OPERADOR: { label: "Operador", color: "#16a34a" },
  }[role] || { label: role, color: "#64748b" };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "var(--background)" }}>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-30 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <Image src="/Logo.png" alt="Til Marcon" width={220} height={64} className="h-14 w-auto object-contain" priority />
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col transition-transform duration-300 md:translate-x-0
          ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:shadow-none"}
        `} 
        style={{ borderColor: "var(--border)" }}
      >
        {/* Logo - Hide on mobile since it's in topbar */}
        <div className="hidden md:flex p-5 border-b items-center gap-3" style={{ borderColor: "var(--border)" }}>
          <Image src="/Logo.png" alt="Til Marcon" width={160} height={48} className="h-10 w-auto object-contain" priority />
        </div>
        
        {/* Nav - flex-1 to push footer down */}
        <div className="p-3 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-2 mt-2 md:mt-0">Navegação</p>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg transition-all text-sm font-medium ${
                    isActive
                      ? "bg-[var(--surface-3)] text-[var(--primary)] font-bold shadow-sm md:shadow-none"
                      : "text-slate-600 hover:bg-[var(--surface-2)] hover:text-slate-900"
                  }`}
                >
                  <item.icon className="w-5 h-5 md:w-[18px] md:h-[18px]" style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer — sempre no final da sidebar */}
        <div className="p-4 border-t mt-auto" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 md:w-9 md:h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--primary)" }}>
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
            className="w-full flex items-center justify-center gap-2 px-3 py-3 md:py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold text-xs uppercase tracking-wider border border-red-100 md:border-transparent"
          >
            <LogOut className="w-4 h-4 md:w-3.5 md:h-3.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-8 bg-slate-50 md:bg-transparent">
        {children}
      </main>
    </div>
  );
}
