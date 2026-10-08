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

// Helper para disparar resumo consolidado de peças críticas no dispositivo
export function sendStockSummaryNotification(criticalItems) {
  if (!criticalItems || criticalItems.length === 0) return null;
  const count = criticalItems.length;
  const zeroCount = criticalItems.filter(i => (i.quantidade || 0) === 0).length;
  const codes = criticalItems.slice(0, 4).map(i => i.codigo).join(", ");
  const extra = count > 4 ? ` e mais ${count - 4} peças` : "";

  const title = zeroCount > 0 
    ? `🚨 ESTOQUE CRÍTICO: ${count} peças em alerta (${zeroCount} esgotadas)`
    : `⚠️ ALERTA AUTOMÁTICO: ${count} peças abaixo do limite mínimo`;

  const body = `Reposição necessária para: ${codes}${extra}. Verifique os detalhes no Almoxarifado.`;

  return sendDeviceNotification({
    title,
    body,
    tag: `marcon-stock-summary`,
    severity: "critical",
    url: "/painel-estoque",
  });
}

// Cache local de notificações em sessionStorage para não repetir alarmes no mesmo saldo da sessão
function getNotifiedCache() {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem("marcon_notified_stock_v2");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markAsNotified(key) {
  if (typeof window === "undefined") return;
  try {
    const cache = getNotifiedCache();
    cache[key] = Date.now();
    sessionStorage.setItem("marcon_notified_stock_v2", JSON.stringify(cache));
  } catch {}
}

/**
 * Função de automação total: analisa o estoque e dispara notificações automaticamente no dispositivo.
 * - Na primeira carga da sessão: avisa sobre peças críticas pendentes de alerta
 * - Durante o uso (tempo real/polling): se qualquer item tiver estoque reduzido para <= limite mínimo, notifica imediatamente
 */
export function autoCheckAndNotifyStock(currentItems, prevItems) {
  if (!Array.isArray(currentItems) || currentItems.length === 0) return;

  const getMin = (i) => i.limiteMinimo ?? 10;
  const getTotal = (i) => (i.quantidade || 0) + (i.estoques_alt?.reduce((s, e) => s + (e.quantidade_avulsa || 0), 0) || 0);

  const criticalList = currentItems.filter(i => getTotal(i) <= getMin(i));
  if (criticalList.length === 0) return;

  const cache = getNotifiedCache();
  const now = Date.now();
  const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutos de cooldown se o saldo permanecer o mesmo

  // CASO 1: Primeira carga da sessão (prevItems é nulo ou vazio)
  if (!prevItems || prevItems.length === 0) {
    const unnotified = criticalList.filter(item => {
      const key = `${item.id}_${getTotal(item)}`;
      const lastTime = cache[key];
      return !lastTime || (now - lastTime > COOLDOWN_MS);
    });

    if (unnotified.length === 0) return;

    // Registra cada peça no cache da sessão
    unnotified.forEach(item => markAsNotified(`${item.id}_${getTotal(item)}`));

    if (unnotified.length === 1) {
      sendStockDeviceNotification(unnotified[0]);
    } else {
      sendStockSummaryNotification(unnotified);
    }
    return;
  }

  // CASO 2: Alteração de estoque em tempo real (baixa de pedido, consumo ou sincronização)
  currentItems.forEach(newItem => {
    const oldItem = prevItems.find(o => o.id === newItem.id);
    if (!oldItem) return;

    const newTotal = getTotal(newItem);
    const oldTotal = getTotal(oldItem);
    const min = getMin(newItem);

    // Condição 1: Cruzou para baixo do limite mínimo
    const crossedThreshold = oldTotal > min && newTotal <= min;
    // Condição 2: Já estava crítico e caiu ainda mais (ex: 3 un para 1 un, ou para 0 un)
    const droppedFurtherWhileCritical = oldTotal <= min && newTotal < oldTotal;

    if (crossedThreshold || droppedFurtherWhileCritical) {
      const key = `${newItem.id}_${newTotal}`;
      markAsNotified(key);
      sendStockDeviceNotification(newItem);
    }
  });
}

// Disparo de teste rápido para validar no dispositivo do usuário (caso necessário para debug)
export function sendTestDeviceNotification() {
  return sendDeviceNotification({
    title: "🔔 Teste de Notificação - Almoxarifado Marcon",
    body: "Notificação recebida com sucesso no seu dispositivo! Alertas sonoros, vibração e notificações nativas estão 100% operacionais.",
    tag: "marcon-test-notification",
    severity: "info",
    url: "/painel-estoque",
  });
}
