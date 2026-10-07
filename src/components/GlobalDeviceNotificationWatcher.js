"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  isDeviceNotificationSupported,
  sendStockDeviceNotification,
} from "@/lib/deviceNotification";

export default function GlobalDeviceNotificationWatcher() {
  const { data: session } = useSession();
  const prevItemsRef = useRef(null);

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

        // Se já temos a lista anterior, verifica se alguma peça caiu para nível crítico
        if (prevItemsRef.current && prevItemsRef.current.length > 0) {
          currentItems.forEach((newItem) => {
            const oldItem = prevItemsRef.current.find((o) => o.id === newItem.id);
            if (oldItem) {
              const min = newItem.limiteMinimo ?? 10;
              // Se a quantidade diminuiu e atingiu ou ficou abaixo do limite mínimo
              if (
                newItem.quantidade < oldItem.quantidade &&
                newItem.quantidade <= min &&
                oldItem.quantidade > min
              ) {
                sendStockDeviceNotification(newItem);
              }
            }
          });
        }

        prevItemsRef.current = currentItems;
      } catch (e) {
        // Silencioso em caso de oscilação de rede
      }
    }

    // Primeira verificação leve após 3 segundos
    const initialTimer = setTimeout(() => {
      checkStockChanges();
    }, 3000);

    // Polling a cada 40 segundos
    const interval = setInterval(checkStockChanges, 40000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [session]);

  return null;
}
