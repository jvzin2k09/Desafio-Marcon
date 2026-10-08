"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  isDeviceNotificationSupported,
  autoCheckAndNotifyStock,
} from "@/lib/deviceNotification";

export default function GlobalDeviceNotificationWatcher() {
  const { data: session } = useSession();
  const prevItemsRef = useRef(null);

  useEffect(() => {
    // Tenta solicitar permissão no primeiro toque/clique do usuário se ainda não estiver definida
    if (isDeviceNotificationSupported() && Notification.permission === "default") {
      const handleUserGesture = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener("click", handleUserGesture);
        window.removeEventListener("keydown", handleUserGesture);
      };
      window.addEventListener("click", handleUserGesture, { once: true });
      window.addEventListener("keydown", handleUserGesture, { once: true });
      return () => {
        window.removeEventListener("click", handleUserGesture);
        window.removeEventListener("keydown", handleUserGesture);
      };
    }
  }, []);

  useEffect(() => {
    // Monitora estoque para almoxarifes e administradores
    if (!session?.user) return;
    const role = session.user.role;
    if (role !== "ALMOXARIFE" && role !== "ADMIN") return;

    let isMounted = true;

    async function checkStockChanges() {
      try {
        const res = await fetch("/api/items", { cache: "no-store" });
        if (!res.ok) return;
        const currentItems = await res.json();
        if (!Array.isArray(currentItems) || !isMounted) return;

        // Disparo e monitoramento 100% automático
        autoCheckAndNotifyStock(currentItems, prevItemsRef.current);

        prevItemsRef.current = currentItems;
      } catch (e) {
        // Silencioso em caso de oscilação de rede
      }
    }

    // Primeira verificação leve após 2 segundos
    const initialTimer = setTimeout(() => {
      checkStockChanges();
    }, 2000);

    // Polling a cada 30 segundos
    const interval = setInterval(checkStockChanges, 30000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [session]);

  return null;
}
