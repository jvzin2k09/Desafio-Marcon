"use client";

import { useState, useEffect, useRef } from "react";
import { 
  AlertTriangle, 
  Bell, 
  BellOff, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  MapPin, 
  ShieldAlert,
  MinusCircle,
  Package,
  X,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Smartphone
} from "lucide-react";
import {
  isDeviceNotificationSupported,
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  sendStockDeviceNotification,
  sendTestDeviceNotification,
  playIndustrialAlertSound,
} from "@/lib/deviceNotification";

export default function PainelEstoquePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notifPerm, setNotifPerm] = useState("default");
  const [lastSync, setLastSync] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const prevItemsRef = useRef([]);
  const [custoRequested, setCustoRequested] = useState({});
  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);
  const [notifyingAll, setNotifyingAll] = useState(false);

  // Inicializa permissão de notificações do dispositivo
  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotifPerm(getDeviceNotificationPermission());
      try {
        const saved = localStorage.getItem("custoRequested");
        if (saved) setCustoRequested(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Busca dados reais da API
  async function fetchItems(silent = false) {
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      if (!res.ok) return;
      const apiItems = await res.json();
      if (!Array.isArray(apiItems)) return;

      // Verifica se algum item cruzou o limite mínimo desde a última fetch
      const prev = prevItemsRef.current;
      if (prev && prev.length > 0) {
        apiItems.forEach(newItem => {
          const oldItem = prev.find(o => o.id === newItem.id);
          if (oldItem) {
            const min = newItem.limiteMinimo ?? 10;
            // Se a quantidade diminuiu e atingiu ou ficou abaixo do limite mínimo
            if (newItem.quantidade < oldItem.quantidade && newItem.quantidade <= min && oldItem.quantidade > min) {
              sendStockDeviceNotification(newItem);
            }
          }
        });
      }

      prevItemsRef.current = apiItems;
      setItems(apiItems);
      setLastSync(new Date());
      if (!silent) setLoading(false);
    } catch {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems(false);
    // Polling silencioso a cada 30s — sem re-render total, só atualiza se mudou
    const interval = setInterval(() => fetchItems(true), 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solicitar permissão de notificação no dispositivo
  const handleRequestNotif = async () => {
    await requestDeviceNotificationPermission();
    setNotifPerm(getDeviceNotificationPermission());
  };

  // Disparo de teste para o dispositivo
  const handleTestDeviceNotification = async () => {
    setTestingNotif(true);
    try {
      if (notifPerm !== "granted") {
        const res = await requestDeviceNotificationPermission();
        setNotifPerm(getDeviceNotificationPermission());
        if (res.permission !== "granted") {
          setTestingNotif(false);
          return;
        }
      }
      sendTestDeviceNotification();
    } finally {
      setTimeout(() => setTestingNotif(false), 800);
    }
  };

  // Notificar todas as peças críticas no dispositivo
  const handleNotifyCriticalItems = async () => {
    if (allCritical.length === 0) return;
    setNotifyingAll(true);
    try {
      if (notifPerm !== "granted") {
        const res = await requestDeviceNotificationPermission();
        setNotifPerm(getDeviceNotificationPermission());
        if (res.permission !== "granted") {
          setNotifyingAll(false);
          return;
        }
      }

      allCritical.forEach((critItem, idx) => {
        setTimeout(() => {
          sendStockDeviceNotification(critItem);
        }, idx * 600);
      });
    } finally {
      setTimeout(() => setNotifyingAll(false), allCritical.length * 600 + 400);
    }
  };



  // Helper para formatar datas com segurança (evita "Invalid Date")
  const formatDate = (dateValue) => {
    if (!dateValue) return "Sem dados";
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "Sem dados";
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (dateValue) => {
    if (!dateValue) return "--:--";
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Contagens e KPIs — limiteMinimo padrão = 10 quando não existir no banco
  const getMin = (item) => item.limiteMinimo ?? 10;
  const getTotal = (item) => item.quantidade + (item.estoques_alt?.reduce((sum, e) => sum + (e.quantidade_avulsa || 0), 0) || 0);
  const emptyItems = items.filter(i => getTotal(i) === 0);
  const lowItems = items.filter(i => getTotal(i) > 0 && getTotal(i) <= getMin(i));
  const okItems = items.filter(i => getTotal(i) > getMin(i));
  const allCritical = [...emptyItems, ...lowItems];

  // Alternância de filtros com limpeza garantida da busca
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSearch("");
  };

  // Itens filtrados
  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    const matchesSearch = 
      item.nome.toLowerCase().includes(q) ||
      item.codigo.toLowerCase().includes(q) ||
      (item.localizacao && item.localizacao.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filter === "low") return getTotal(item) > 0 && getTotal(item) <= getMin(item);
    if (filter === "empty") return getTotal(item) === 0;
    if (filter === "ok") return getTotal(item) > getMin(item);
    return true;
  });


  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#1B3A6B] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500 lg:text-slate-400">Carregando estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden flex flex-col p-3 sm:p-4 max-w-7xl mx-auto space-y-2.5 sm:space-y-3">
      
      {/* CABEÇALHO */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200">
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-slate-900 lg:text-white">
                Painel de Controle de Estoque
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 lg:text-slate-400 mt-0.5">
              Monitoramento de unidades disponíveis e alertas automáticos enviados ao dispositivo
            </p>
          </div>

          {/* CONTROLES DE NOTIFICAÇÃO NO DISPOSITIVO */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status / Ativação de Notificações */}
            <button
              onClick={handleRequestNotif}
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                notifPerm === "granted"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  : notifPerm === "denied"
                  ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-md shadow-blue-500/20"
              }`}
              title={
                notifPerm === "denied"
                  ? "Permissão bloqueada no navegador. Clique no ícone de cadeado na barra de endereços para permitir notificações."
                  : notifPerm === "granted"
                  ? "Notificações nativas e som industrial ativos no dispositivo"
                  : "Clique para permitir o envio de notificações no seu dispositivo"
              }
            >
              {notifPerm === "granted" ? (
                <Bell className="w-4 h-4 text-emerald-600" />
              ) : notifPerm === "denied" ? (
                <BellOff className="w-4 h-4 text-red-600" />
              ) : (
                <Bell className="w-4 h-4 text-white animate-bounce" />
              )}
              {notifPerm === "granted"
                ? "Notificações Ativas no Dispositivo"
                : notifPerm === "denied"
                ? "Notificações Bloqueadas"
                : "Ativar no Dispositivo"}
            </button>

            {/* Botão Testar no Dispositivo */}
            <button
              onClick={handleTestDeviceNotification}
              disabled={testingNotif}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold border bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 hover:lg:bg-slate-700/80 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Disparar notificação de teste imediata com som industrial e card nativo"
            >
              <Smartphone className="w-4 h-4 text-blue-600 lg:text-blue-400" />
              {testingNotif ? "Disparando Teste..." : "Testar no Dispositivo"}
            </button>

            {/* Botão de Notificar Todas as Peças Críticas */}
            {allCritical.length > 0 && (
              <button
                onClick={handleNotifyCriticalItems}
                disabled={notifyingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 lg:bg-red-950/40 lg:border-red-800/60 lg:text-red-300 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Enviar alertas de todas as peças críticas para este dispositivo"
              >
                <Radio className="w-4 h-4 text-red-600 animate-pulse" />
                {notifyingAll ? "Notificando..." : `Notificar Críticas (${allCritical.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* REQUISITO 2.b: CARD/BANNER DE ALERTA EM DESTAQUE NO TOPO DA TELA */}
      {allCritical.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-l-4 border-l-red-500 border border-red-200 p-3.5 sm:p-4 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-red-900 uppercase tracking-wider">
                  Atenção: Peças em Nível Crítico que Precisam de Reposição Urgente
                </h3>
                <p className="text-[11px] sm:text-xs text-red-700">
                  As peças abaixo estão com saldo igual ou abaixo do limite mínimo de segurança estipulado.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleNotifyCriticalItems}
                disabled={notifyingAll}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                title="Disparar alerta das peças críticas para o dispositivo"
              >
                <Bell className="w-3.5 h-3.5" />
                {notifyingAll ? "Notificando..." : "Notificar no Dispositivo"}
              </button>
              <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 font-mono font-bold text-xs rounded-xl">
                {allCritical.length} {allCritical.length === 1 ? "PEÇA CRÍTICA" : "PEÇAS CRÍTICAS"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {allCritical.slice(0, 4).map(item => (
              <div key={item.id} className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setFilter("all");
                    setSearch(item.codigo);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-100/80 hover:bg-red-200 border border-red-300 text-xs font-medium text-red-900 transition-all hover:scale-105 cursor-pointer"
                  title="Filtrar esta peça na tabela"
                >
                  {getTotal(item) === 0 
                    ? <XCircle className="w-3.5 h-3.5 shrink-0 text-red-700" />
                    : <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />}
                  <span className="font-mono font-bold">{item.codigo}</span>
                  <span className="truncate max-w-[150px]">{item.nome}</span>
                  <span className="font-mono font-bold text-red-700 bg-white/70 px-1.5 py-0.5 rounded">
                    {getTotal(item)}/{getMin(item)} {item.unidade}
                  </span>
                </button>
                <button
                  onClick={() => sendStockDeviceNotification(item)}
                  className="p-1 rounded-lg bg-red-200/80 hover:bg-red-300 text-red-800 border border-red-300 transition-all cursor-pointer"
                  title={`Disparar notificação de ${item.codigo} para o dispositivo`}
                >
                  <Bell className="w-3 h-3" />
                </button>
              </div>
            ))}
            {allCritical.length > 4 && (
              <button
                onClick={() => setShowCriticalModal(true)}
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold transition-all hover:bg-red-700 shadow-sm cursor-pointer"
              >
                Ver todas ({allCritical.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* CARDS DE MÉTRICAS (KPIs) — CLICÁVEIS E INTERATIVOS */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 shrink-0">
        <button
          type="button"
          onClick={() => handleFilterChange("all")}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === "all" && !search
              ? "ring-2 ring-blue-500 bg-blue-500/10 border-blue-500 shadow-md"
              : "bg-white lg:bg-slate-900/80 hover:bg-slate-50 hover:lg:bg-slate-800/80 border-slate-200 lg:border-slate-800/80 shadow-sm"
          } border-l-4 border-l-blue-600 lg:backdrop-blur-md lg:shadow-xl lg:text-slate-200`}
          title="Clique para ver todas as peças"
        >
          <div className="flex items-center justify-between text-slate-500 lg:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total de Itens</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 lg:text-white">{items.length}</div>
          <span className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 block">Peças monitoradas</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange("ok")}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === "ok" && !search
              ? "ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500 shadow-md"
              : "bg-white lg:bg-slate-900/80 hover:bg-slate-50 hover:lg:bg-slate-800/80 border-slate-200 lg:border-slate-800/80 shadow-sm"
          } border-l-4 border-l-emerald-500 lg:backdrop-blur-md lg:shadow-xl lg:text-slate-200`}
          title="Clique para ver apenas peças com nível seguro (Em Dia)"
        >
          <div className="flex items-center justify-between text-slate-500 lg:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Nível Seguro</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">{okItems.length}</div>
          <span className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 block">Acima do mínimo</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange("low")}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === "low" && !search
              ? "ring-2 ring-amber-500 bg-amber-500/10 border-amber-500 shadow-md"
              : "bg-white lg:bg-slate-900/80 hover:bg-slate-50 hover:lg:bg-slate-800/80 border-slate-200 lg:border-slate-800/80 shadow-sm"
          } border-l-4 border-l-amber-500 lg:backdrop-blur-md lg:shadow-xl lg:text-slate-200`}
          title="Clique para ver apenas peças com estoque baixo"
        >
          <div className="flex items-center justify-between text-slate-500 lg:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Est. Baixo</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600">{lowItems.length}</div>
          <span className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 block">Abaixo do limite</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterChange("empty")}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === "empty" && !search
              ? "ring-2 ring-red-500 bg-red-500/10 border-red-500 shadow-md"
              : "bg-white lg:bg-slate-900/80 hover:bg-slate-50 hover:lg:bg-slate-800/80 border-slate-200 lg:border-slate-800/80 shadow-sm"
          } border-l-4 border-l-red-600 lg:backdrop-blur-md lg:shadow-xl lg:text-slate-200`}
          title="Clique para ver apenas peças esgotadas"
        >
          <div className="flex items-center justify-between text-slate-500 lg:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Esgotados</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-red-600">{emptyItems.length}</div>
          <span className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 block">Saldo zerado (0 un)</span>
        </button>
      </div>

      {/* REQUISITO 3: BARRA DE FERRAMENTAS COM BUSCA EM TEMPO REAL E FILTROS */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 shrink-0 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar peça por código, nome..."
            className="w-full pl-10 pr-10 py-2 bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 lg:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 lg:hover:text-white bg-slate-200 lg:bg-slate-700 rounded-full transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 w-full">
            <button
              onClick={() => handleFilterChange("all")}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 text-slate-600 lg:text-slate-300 hover:bg-slate-200 hover:lg:bg-slate-800/60"
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => handleFilterChange("low")}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filter === "low" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Est. Baixo ({lowItems.length})
            </button>
            <button
              onClick={() => handleFilterChange("empty")}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filter === "empty" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" /> Esgotados ({emptyItems.length})
            </button>
            <button
              onClick={() => handleFilterChange("ok")}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filter === "ok" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Em Dia ({okItems.length})
            </button>
          </div>

          {search && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-lg text-xs font-medium">
              <span>Buscando: <strong className="font-mono text-white">"{search}"</strong></span>
              <button
                onClick={() => setSearch("")}
                className="hover:text-white transition-colors cursor-pointer ml-1"
                title="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABELA DE ESTOQUE COM SCROLL E DESTAQUE DE ALERTAS */}
      <div className="w-full lg:rounded-2xl lg:border lg:border-slate-800/80 lg:shadow-xl flex flex-col lg:overflow-hidden lg:bg-slate-900/80 lg:backdrop-blur-md lg:text-slate-200">
        
        {/* Visão Mobile (Cards) — scroll contido */}
        <div className="block lg:hidden max-h-[62vh] overflow-y-auto no-scrollbar space-y-3 pb-6">
          {filteredItems.length === 0 ? (
             <div className="py-8 text-center text-slate-400 font-medium bg-white lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 rounded-xl px-4">
               <p className="text-sm">
                 Nenhuma peça encontrada com os critérios informados
                 {search ? (
                   <> para <span className="font-mono font-bold text-white">"{search}"</span> {filter !== "all" && <span>na categoria <strong>{filter === "ok" ? "Em Dia" : filter === "low" ? "Est. Baixo" : "Esgotados"}</strong></span>}</>
                 ) : null}.
               </p>
               {search && (
                 <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                   <button
                     onClick={() => setSearch("")}
                     className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
                   >
                     <X className="w-3.5 h-3.5" /> Limpar busca e ver {filter === "ok" ? `as ${okItems.length} peças Em Dia` : "todos"}
                   </button>
                 </div>
               )}
             </div>
          ) : (
            filteredItems.map((item) => {
              const isZero = item.quantidade === 0;
              const isLow = item.quantidade > 0 && item.quantidade <= getMin(item);
              
              return (
                <div key={item.id} className={`p-3 sm:p-4 bg-white lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 rounded-2xl shadow-sm border-l-4 relative overflow-hidden ${
                  isZero ? "border-l-red-600 border-t border-r border-b border-red-100" 
                  : isLow ? "border-l-amber-500 border-t border-r border-b border-amber-100" 
                  : "border-l-emerald-500 border-t border-r border-b border-slate-100"
                }`}>
                  {/* Linha Superior: Nome + Badge */}
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 lg:text-white truncate max-w-[200px]">{item.nome}</h3>
                      {custoRequested[item.id] && isZero && (
                        <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Custo Solicitado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isZero ? (
                        <span className="shrink-0 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide animate-pulse">Esgotado</span>
                      ) : isLow ? (
                        <span className="shrink-0 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Est. Baixo</span>
                      ) : (
                        <span className="shrink-0 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Em Dia</span>
                      )}
                      {(isZero || isLow) && (
                        <button
                          onClick={() => sendStockDeviceNotification(item)}
                          className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 transition-all cursor-pointer"
                          title={`Disparar alerta de ${item.codigo} para o dispositivo`}
                        >
                          <Bell className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Linha Inferior: Código, Local, Qtd, Data */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{item.codigo}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-500 lg:text-slate-400"><MapPin className="w-3 h-3" /> {item.localizacao}</span>
                    <span className={`font-mono text-xs font-black ${isZero ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                      {item.quantidade} <span className="text-[10px] font-medium text-slate-400">{item.unidade} {item.qtd_por_caixa > 1 ? `(${Math.floor(item.quantidade / item.qtd_por_caixa)} Cxs)` : ''}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {formatDate(item.ultimaAtualizacao || item.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Visão Desktop (Tabela com altura máxima para até 5 itens visíveis e scroll a partir daí) */}
        <div className="hidden lg:block overflow-y-auto custom-scrollbar max-h-[305px] rounded-2xl relative overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700 backdrop-blur-sm shadow-sm">
              <tr className="bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 border-b border-slate-200 text-[11px] font-bold text-slate-500 lg:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700">Código</th>
                <th className="py-2.5 px-4 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700">Peça / Descrição</th>
                <th className="py-2.5 px-4 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700">Localização</th>
                <th className="py-2.5 px-4 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700">Disponível</th>
                <th className="py-2.5 px-4 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700">Limite Mínimo</th>
                <th className="py-2.5 px-4 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700">Nível Visual</th>
                <th className="py-2.5 px-4 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700">Status</th>
                <th className="py-2.5 px-4 lg:bg-slate-800/90 lg:text-slate-300 lg:border-slate-700">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    <p className="text-sm">
                      Nenhuma peça encontrada com os critérios informados
                      {search ? (
                        <> para <span className="font-mono font-bold text-white">"{search}"</span> {filter !== "all" && <span>na categoria <strong>{filter === "ok" ? "Em Dia" : filter === "low" ? "Est. Baixo" : "Esgotados"}</strong></span>}</>
                      ) : null}.
                    </p>
                    {search && (
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={() => setSearch("")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
                        >
                          <X className="w-3.5 h-3.5" /> Limpar busca e ver {filter === "ok" ? `as ${okItems.length} peças Em Dia` : filter === "low" ? `as ${lowItems.length} peças de Est. Baixo` : filter === "empty" ? `as ${emptyItems.length} peças Esgotadas` : `todas as peças`}
                        </button>
                        {filter !== "all" && (
                          <button
                            onClick={() => setFilter("all")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-all cursor-pointer"
                          >
                            Buscar "{search}" em todo o estoque
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const total = getTotal(item);
                  const isZero = total === 0;
                  const isLow = total > 0 && total <= getMin(item);
                  const isSobras = item.quantidade === 0 && total > 0;
                  const maxCap = Math.max(getMin(item) * 2, total, 1);
                  const percent = Math.min(100, Math.round((total / maxCap) * 100));

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors relative ${
                        isZero
                          ? "bg-red-50/70 lg:bg-red-950/40 hover:bg-red-100/60 hover:lg:bg-red-900/60"
                          : isLow || isSobras
                          ? "bg-amber-50/60 lg:bg-amber-950/40 hover:bg-amber-100/50 hover:lg:bg-amber-900/50"
                          : "hover:bg-slate-50 hover:lg:bg-slate-800/60 lg:bg-transparent lg:border-slate-700 lg:text-slate-200"
                      }`}
                    >
                      {/* CÓDIGO */}
                      <td className="py-2.5 px-4 font-mono font-bold text-xs text-blue-900 lg:text-blue-300 relative">
                        {isZero && <div className="absolute left-0 top-0 w-1 h-full bg-red-600" />}
                        {(isLow || isSobras) && <div className="absolute left-0 top-0 w-1 h-full bg-amber-500" />}
                        <span className="bg-blue-50 lg:bg-blue-950/60 lg:border-blue-800/50 px-2 py-1 rounded border border-blue-200/60">
                          {item.codigo}
                        </span>
                      </td>

                      {/* NOME / UNIDADE */}
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 lg:text-white flex items-center gap-2">
                          {item.nome}
                          {custoRequested[item.id] && isZero && (
                            <span className="text-[9px] uppercase tracking-wide bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Solicitado
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{item.unidade}</span>
                      </td>

                      {/* LOCALIZAÇÃO */}
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 lg:text-slate-300 bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 px-2 py-0.5 rounded">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.localizacao}
                        </span>
                      </td>

                      {/* DISPONÍVEL */}
                      <td className="py-2.5 px-4 font-mono font-black text-sm">
                        <span className={isZero ? "text-red-600" : (isLow || isSobras) ? "text-amber-600" : "text-slate-800 lg:text-white"}>
                          {total}
                        </span>
                        <span className="text-xs font-medium text-slate-400 ml-1">
                          {item.unidade} {item.qtd_por_caixa > 1 ? `(${Math.floor(total / item.qtd_por_caixa)} Cxs)` : ''}
                        </span>
                      </td>

                      {/* LIMITE MÍNIMO */}
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-500 lg:text-slate-400">
                        {getMin(item)} {item.unidade}
                      </td>

                      {/* BARRA VISUAL DE NÍVEL */}
                      <td className="py-2.5 px-4">
                        <div className="w-28 space-y-1">
                          <div className="w-full h-2 bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isZero
                                  ? "bg-red-600"
                                  : isLow
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {percent}% capacidade
                          </div>
                        </div>
                      </td>

                      {/* BADGES DE STATUS */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          {isZero ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                              <XCircle className="w-3.5 h-3.5" /> Esgotado
                            </span>
                          ) : isSobras ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5" /> Disponível em Sobras
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5" /> Estoque Baixo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Em Dia
                            </span>
                          )}

                          {(isZero || isLow) && (
                            <button
                              onClick={() => sendStockDeviceNotification(item)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer shadow-xs active:scale-95"
                              title={`Disparar notificação de ${item.codigo} para o dispositivo`}
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* ATUALIZADO */}
                      <td className="py-2.5 px-4 text-xs font-mono text-slate-400">
                        {formatDateShort(item.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCriticalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white lg:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 lg:border-slate-700">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 lg:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 lg:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Peças em Nível Crítico ({allCritical.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNotifyCriticalItems}
                  disabled={notifyingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Enviar notificações de todas as peças críticas para este dispositivo"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {notifyingAll ? "Notificando..." : "Notificar Todas no Dispositivo"}
                </button>
                <button onClick={() => setShowCriticalModal(false)} className="text-slate-400 hover:text-slate-600 ml-1">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {allCritical.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-slate-50 lg:bg-slate-800 p-3 rounded-xl border border-slate-200 lg:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-blue-900 lg:text-blue-300 bg-blue-50 lg:bg-blue-900/30 px-2 py-1 rounded border border-blue-200 lg:border-blue-800/50">
                      {item.codigo}
                    </span>
                    <span className="text-sm font-bold text-slate-800 lg:text-slate-200">{item.nome}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`font-mono text-sm font-black ${getTotal(item) === 0 ? 'text-red-600' : 'text-amber-500'}`}>
                        {getTotal(item)} / {getMin(item)} {item.unidade}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">{getTotal(item) === 0 ? 'Esgotado' : 'Baixo'}</div>
                    </div>
                    <button
                      onClick={() => sendStockDeviceNotification(item)}
                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-800/40 dark:text-red-300 transition-all cursor-pointer"
                      title={`Disparar alerta de ${item.codigo} para o dispositivo`}
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
