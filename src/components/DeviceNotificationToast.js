"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, X, Bell, ShieldAlert, ArrowRight } from "lucide-react";

export default function DeviceNotificationToast() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const handleDeviceAlert = (e) => {
      const detail = e.detail;
      if (!detail) return;

      const id = Date.now() + Math.random();
      const newAlert = { id, ...detail };

      setAlerts((prev) => [newAlert, ...prev].slice(0, 3)); // Mantém até 3 toasts na tela

      // Auto dismiss após 7 segundos
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }, 7000);
    };

    window.addEventListener("marcon:device-alert", handleDeviceAlert);
    return () => window.removeEventListener("marcon:device-alert", handleDeviceAlert);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {alerts.map((alert) => {
        const isCritical = alert.severity === "critical";
        const isWarning = alert.severity === "warning";

        return (
          <div
            key={alert.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              isCritical
                ? "bg-slate-900/95 border-red-500/80 text-white shadow-red-950/40"
                : isWarning
                ? "bg-slate-900/95 border-amber-500/80 text-white shadow-amber-950/40"
                : "bg-slate-900/95 border-blue-500/80 text-white shadow-blue-950/40"
            } backdrop-blur-md`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isCritical
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : isWarning
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                }`}
              >
                {isCritical ? (
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                ) : isWarning ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                      Dispositivo
                    </span>
                    <span className="text-[10px] text-slate-400">Agora</span>
                  </div>
                  <button
                    onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                    className="text-slate-400 hover:text-white transition-colors p-0.5"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="font-bold text-xs sm:text-sm mt-1 leading-snug text-white">
                  {alert.title}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
                  {alert.body}
                </p>

                {alert.url && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-end">
                    <Link
                      href={alert.url}
                      onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Acessar Painel <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
