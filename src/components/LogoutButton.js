"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:text-red-500 transition-all duration-200 group"
    >
      <LogOut className="w-4 h-4 group-hover:text-red-500 transition-colors" />
      <span className="hidden sm:inline font-medium text-xs uppercase tracking-widest">Sair</span>
    </button>
  );
}
