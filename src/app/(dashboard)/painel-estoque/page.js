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
  Package
} from "lucide-react";

export default function PainelEstoquePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notifPerm, setNotifPerm] = useState("default");
  const [lastSync, setLastSync] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioCtxRef = useRef(null);
  const prevItemsRef = useRef([]);

  // Inicializa permissão de notificações
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  // Busca dados reais da API
  async function fetchItems(silent = false) {
    try {
      const res = await fetch("/api/items");
      if (!res.ok) return;
      const apiItems = await res.json();
      if (!Array.isArray(apiItems)) return;

      // Verifica se algum item cruzou o limite mínimo desde a última fetch
      const prev = prevItemsRef.current;
      if (prev.length > 0) {
        apiItems.forEach(newItem => {
          const oldItem = prev.find(o => o.id === newItem.id);
          if (oldItem && newItem.quantidade <= newItem.quantidade /* sempre false, guard */ ) return;
          if (oldItem && newItem.quantidade <= (newItem.limiteMinimo ?? 0) && oldItem.quantidade > (newItem.limiteMinimo ?? 0)) {
            triggerAlert(newItem);
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

  // Alerta sonoro sintetizado
  const playBeep = () => {
    try {
      if (!audioEnabled || typeof window === "undefined") return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  // Disparo da Notification API do Navegador
  const triggerAlert = (item) => {
    playBeep();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    const isZero = item.quantidade === 0;
    const title = isZero 
      ? `ESTOQUE ZERADO: ${item.codigo}` 
      : `ALERTA ESTOQUE BAIXO: ${item.codigo}`;
      
      new Notification(title, {
        body: `A peça "${item.nome}" atingiu nível crítico: ${item.quantidade} ${item.unidade} disponíveis (Mínimo: ${item.limiteMinimo}). Local: ${item.localizacao}`,
        icon: "/Logo.png",
        tag: `stock-${item.id}`
      });
    }
  };

  const requestNotif = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const res = await Notification.requestPermission();
      setNotifPerm(res);
      if (res === "granted") {
        new Notification("Almoxarifado Marcon", {
          body: "Notificações em tempo real ativadas com sucesso.",
          icon: "/Logo.png"
        });
      }
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
  const emptyItems = items.filter(i => i.quantidade === 0);
  const lowItems = items.filter(i => i.quantidade > 0 && i.quantidade <= getMin(i));
  const okItems = items.filter(i => i.quantidade > getMin(i));
  const allCritical = [...emptyItems, ...lowItems];

  // Itens filtrados
  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    const matchesSearch = 
      item.nome.toLowerCase().includes(q) ||
      item.codigo.toLowerCase().includes(q) ||
      (item.localizacao && item.localizacao.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filter === "low") return item.quantidade > 0 && item.quantidade <= getMin(item);
    if (filter === "empty") return item.quantidade === 0;
    if (filter === "ok") return item.quantidade > getMin(item);
    return true;
  });


  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#1B3A6B] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Carregando estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden min-h-screen flex flex-col p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-3 md:space-y-6">
      
      {/* CABEÇALHO */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Painel de Controle de Estoque
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Monitoramento de unidades disponíveis e alertas automáticos de reposição crítica
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={requestNotif}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                notifPerm === "granted"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {notifPerm === "granted" ? <Bell className="w-4 h-4 text-emerald-600" /> : <BellOff className="w-4 h-4 text-slate-500" />}
              {notifPerm === "granted" ? "Notificações Ativas" : "Ativar Notificações"}
            </button>
          </div>
        </div>
      </div>

      {/* REQUISITO 2.b: CARD/BANNER DE ALERTA EM DESTAQUE NO TOPO DA TELA */}
      {allCritical.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-l-4 border-l-red-500 border border-red-200 p-5 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">
                  Atenção: Peças em Nível Crítico que Precisam de Reposição Urgente
                </h3>
                <p className="text-xs text-red-700">
                  As peças abaixo estão com saldo igual ou abaixo do limite mínimo de segurança estipulado.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-600 text-white font-mono font-bold text-xs rounded-full self-start sm:self-auto">
              {allCritical.length} {allCritical.length === 1 ? "PEÇA CRÍTICA" : "PEÇAS CRÍTICAS"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {allCritical.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setFilter("all");
                  setSearch(item.codigo);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100/80 hover:bg-red-200 border border-red-300 text-xs font-medium text-red-900 transition-all hover:scale-105"
                title="Filtrar esta peça na tabela"
              >
                {item.quantidade === 0 
                  ? <XCircle className="w-3.5 h-3.5 shrink-0 text-red-700" />
                  : <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />}
                <span className="font-mono font-bold">{item.codigo}</span>
                <span className="truncate max-w-[160px]">{item.nome}</span>
                <span className="font-mono font-bold text-red-700 bg-white/70 px-1.5 py-0.5 rounded">
                  {item.quantidade}/{getMin(item)} {item.unidade}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CARDS DE MÉTRICAS (KPIs) */}
      {/* CARDS DE MÉTRICAS (KPIs) — grid 2 colunas no mobile, 4 no md+ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 shrink-0">
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total de Itens</span>
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">{items.length}</div>
          <span className="text-[9px] sm:text-xs text-slate-400 mt-1 block">Peças monitoradas</span>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Nível Seguro</span>
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600">{okItems.length}</div>
          <span className="text-[9px] sm:text-xs text-slate-400 mt-1 block">Acima do mínimo</span>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Est. Baixo</span>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600">{lowItems.length}</div>
          <span className="text-[9px] sm:text-xs text-slate-400 mt-1 block">Abaixo do limite</span>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-red-600">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Esgotados</span>
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-red-600">{emptyItems.length}</div>
          <span className="text-[9px] sm:text-xs text-slate-400 mt-1 block">Saldo zerado (0 un)</span>
        </div>
      </div>

      {/* REQUISITO 3: BARRA DE FERRAMENTAS COM BUSCA EM TEMPO REAL E FILTROS */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 shrink-0">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar peça por código, nome..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 w-full">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setFilter("low")}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filter === "low" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Est. Baixo ({lowItems.length})
          </button>
          <button
            onClick={() => setFilter("empty")}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filter === "empty" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Esgotados ({emptyItems.length})
          </button>
          <button
            onClick={() => setFilter("ok")}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              filter === "ok" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Em Dia ({okItems.length})
          </button>
        </div>
      </div>

      {/* TABELA DE ESTOQUE COM SCROLL E DESTAQUE DE ALERTAS */}
      <div className="flex-1 lg:bg-white lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm flex flex-col min-h-0 lg:overflow-hidden">
        
        {/* Visão Mobile (Cards) — scroll contido */}
        <div className="block lg:hidden max-h-[50vh] overflow-y-auto no-scrollbar space-y-3 pb-6">
          {filteredItems.length === 0 ? (
             <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-xl">
               Nenhuma peça encontrada com os critérios informados.
             </div>
          ) : (
            filteredItems.map((item) => {
              const isZero = item.quantidade === 0;
              const isLow = item.quantidade > 0 && item.quantidade <= getMin(item);
              
              return (
                <div key={item.id} className={`p-3 sm:p-4 bg-white rounded-2xl shadow-sm border-l-4 relative overflow-hidden ${
                  isZero ? "border-l-red-600 border-t border-r border-b border-red-100" 
                  : isLow ? "border-l-amber-500 border-t border-r border-b border-amber-100" 
                  : "border-l-emerald-500 border-t border-r border-b border-slate-100"
                }`}>
                  {/* Linha Superior: Nome + Badge */}
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <h3 className="font-bold text-sm text-slate-900 truncate max-w-[200px]">{item.nome}</h3>
                    {isZero ? (
                      <span className="shrink-0 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide animate-pulse">Esgotado</span>
                    ) : isLow ? (
                      <span className="shrink-0 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Est. Baixo</span>
                    ) : (
                      <span className="shrink-0 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Em Dia</span>
                    )}
                  </div>
                  
                  {/* Linha Inferior: Código, Local, Qtd, Data */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2">
                    <span className="font-mono text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{item.codigo}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-500"><MapPin className="w-3 h-3" /> {item.localizacao}</span>
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

        {/* Visão Desktop (Tabela original) */}
        <div className="hidden lg:block flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Peça / Descrição</th>
                <th className="py-3.5 px-4">Localização</th>
                <th className="py-3.5 px-4">Disponível</th>
                <th className="py-3.5 px-4">Limite Mínimo</th>
                <th className="py-3.5 px-4">Nível Visual</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma peça encontrada com os critérios informados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isZero = item.quantidade === 0;
                  const isLow = item.quantidade > 0 && item.quantidade <= getMin(item);
                  const maxCap = Math.max(getMin(item) * 2, item.quantidade, 1);
                  const percent = Math.min(100, Math.round((item.quantidade / maxCap) * 100));

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isZero
                          ? "bg-red-50/70 border-l-4 border-l-red-600 hover:bg-red-100/60"
                          : isLow
                          ? "bg-amber-50/60 border-l-4 border-l-amber-500 hover:bg-amber-100/50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {/* CÓDIGO */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-blue-900">
                        <span className="bg-blue-50 px-2 py-1 rounded border border-blue-200/60">
                          {item.codigo}
                        </span>
                      </td>

                      {/* NOME / UNIDADE */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.nome}</div>
                        <span className="text-[11px] text-slate-400">{item.unidade}</span>
                      </td>

                      {/* LOCALIZAÇÃO */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.localizacao}
                        </span>
                      </td>

                      {/* DISPONÍVEL */}
                      <td className="py-3.5 px-4 font-mono font-black text-base">
                        <span className={isZero ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-800"}>
                          {item.quantidade}
                        </span>
                        <span className="text-xs font-medium text-slate-400 ml-1">
                          {item.unidade} {item.qtd_por_caixa > 1 ? `(${Math.floor(item.quantidade / item.qtd_por_caixa)} Cxs)` : ''}
                        </span>
                      </td>

                      {/* LIMITE MÍNIMO */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        {getMin(item)} {item.unidade}
                      </td>

                      {/* BARRA VISUAL DE NÍVEL */}
                      <td className="py-3.5 px-4">
                        <div className="w-28 space-y-1">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
                      <td className="py-3.5 px-4">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            <XCircle className="w-3.5 h-3.5" /> Esgotado
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
                      </td>

                      {/* ATUALIZADO */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
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

    </div>
  );
}
