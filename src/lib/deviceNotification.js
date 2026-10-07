// src/lib/deviceNotification.js
/**
 * Serviço de Notificações para o Dispositivo - Marcon Almoxarifado
 * Utiliza a Notification API nativa do navegador/SO (Windows Action Center, Android, macOS),
 * combinada com Web Audio API para alertas sonoros industriais e Vibração para dispositivos móveis.
 */

// Verifica se o navegador suporta notificações nativas
export function isDeviceNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

// Retorna o status atual da permissão ('granted', 'denied', 'default' ou 'unsupported')
export function getDeviceNotificationPermission() {
  if (!isDeviceNotificationSupported()) return "unsupported";
  return Notification.permission;
}

// Solicita permissão do usuário para enviar notificações para o dispositivo
export async function requestDeviceNotificationPermission() {
  if (!isDeviceNotificationSupported()) {
    return {
      success: false,
      permission: "unsupported",
      message: "Seu navegador ou dispositivo não possui suporte à Notification API.",
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Dispara confirmação imediata no dispositivo
      sendDeviceNotification({
        title: "Marcon - Notificações Ativadas",
        body: "Seu dispositivo está conectado aos alertas em tempo real do almoxarifado.",
        tag: "marcon-setup-success",
        severity: "info",
      });
      return { success: true, permission, message: "Permissão concedida com sucesso!" };
    } else if (permission === "denied") {
      return {
        success: false,
        permission,
        message: "As notificações foram bloqueadas. Clique no ícone de cadeado/ajustes ao lado da URL para permitir.",
      };
    } else {
      return { success: false, permission, message: "Aguardando resposta de permissão." };
    }
  } catch (error) {
    console.error("Erro ao solicitar permissão de notificação:", error);
    return { success: false, permission: "denied", message: error.message };
  }
}

// Alerta sonoro sintetizado industrial de alta nitidez (Web Audio API)
let audioContextInstance = null;

export function playIndustrialAlertSound(type = "critical") {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextInstance || audioContextInstance.state === "closed") {
      audioContextInstance = new AudioContextClass();
    }

    if (audioContextInstance.state === "suspended") {
      audioContextInstance.resume();
    }

    const ctx = audioContextInstance;
    const now = ctx.currentTime;

    if (type === "critical") {
      // Tom 1 (Grave industrial de alerta: 700Hz -> 500Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(700, now);
      osc1.frequency.exponentialRampToValueAtTime(450, now + 0.22);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Tom 2 (Segundo bip em eco industrial rápido)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(850, now + 0.26);
      osc2.frequency.exponentialRampToValueAtTime(520, now + 0.5);
      gain2.gain.setValueAtTime(0.25, now + 0.26);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.26);
      osc2.stop(now + 0.5);
    } else {
      // Tom suave de confirmação / teste (dois bipes senoidais)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    // Alguns navegadores exigem interação do usuário antes de iniciar o áudio
    console.debug("Web Audio API ainda não liberada por interação:", e);
  }
}

// Vibração para dispositivos móveis (Android, telas touch)
export function vibrateDevice(pattern = [200, 100, 200]) {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

// Disparo principal da Notificação para o Dispositivo
export function sendDeviceNotification({
  title,
  body,
  icon = "/Logo.png",
  badge = "/Logo.png",
  tag,
  severity = "critical", // 'critical', 'warning', 'info'
  onClick,
  url,
}) {
  // 1. Toca o alerta sonoro e vibra o dispositivo
  playIndustrialAlertSound(severity === "critical" ? "critical" : "info");
  vibrateDevice(severity === "critical" ? [300, 100, 300, 100, 300] : [150, 80, 150]);

  // 2. Dispara evento customizado para o Toast em tela (garante visibilidade mesmo se a janela estiver focada ou SO em 'Foco')
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("marcon:device-alert", {
        detail: { title, body, severity, tag, url, timestamp: new Date() },
      })
    );
  }

  // 3. Disparo da Notificação Nativa do Sistema Operacional / Dispositivo
  if (isDeviceNotificationSupported() && Notification.permission === "granted") {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge,
        tag: tag || `marcon-${Date.now()}`,
        renotify: true,
        requireInteraction: severity === "critical", // Permanece no Windows até interação se crítico
        silent: false,
      });

      notif.onclick = () => {
        if (typeof window !== "undefined") {
          window.focus();
          if (url && window.location.pathname !== url) {
            window.location.href = url;
          }
        }
        if (onClick) onClick();
      };

      return notif;
    } catch (e) {
      console.error("Erro ao emitir Notification nativa:", e);
    }
  }

  return null;
}

// Helper para disparar alerta de estoque crítico/esgotado de um item
export function sendStockDeviceNotification(item) {
  const isZero = (item.quantidade ?? 0) === 0;
  const codigo = item.codigo || "ITEM";
  const nome = item.nome || "Peça Industrial";
  const qtd = item.quantidade ?? 0;
  const min = item.limiteMinimo ?? 10;
  const unidade = item.unidade || "UN";
  const local = item.localizacao || "Almoxarifado Central";

  const title = isZero
    ? `🚨 ESTOQUE ESGOTADO: ${codigo}`
    : `⚠️ ALERTA ESTOQUE BAIXO: ${codigo}`;

  const body = isZero
    ? `A peça "${nome}" está com saldo ZERADO (0 ${unidade}). Reposição imediata exigida! Local: ${local}`
    : `A peça "${nome}" atingiu nível crítico: ${qtd} ${unidade} disponíveis (Mínimo: ${min} ${unidade}). Local: ${local}`;

  return sendDeviceNotification({
    title,
    body,
    tag: `marcon-stock-${item.id || codigo}`,
    severity: isZero ? "critical" : "warning",
    url: "/painel-estoque",
  });
}

// Disparo de teste rápido para validar no dispositivo do usuário
export function sendTestDeviceNotification() {
  return sendDeviceNotification({
    title: "🔔 Teste de Notificação - Almoxarifado Marcon",
    body: "Notificação recebida com sucesso no seu dispositivo! Alertas sonoros, vibração e notificações nativas estão 100% operacionais.",
    tag: "marcon-test-notification",
    severity: "info",
    url: "/painel-estoque",
  });
}
