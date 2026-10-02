"use client";

import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, X, Undo2, Loader2, Camera, ArrowRight,
  ClipboardList, MoreVertical, AlertTriangle, Package,
  CheckCircle, User, Layers, Zap, ChevronRight
} from "lucide-react";
import { SeparacaoChecklistModal } from "./SeparacaoChecklistModal";

const SPRING = { type: "spring", stiffness: 300, damping: 26 };

function getTempoEspera(ds) {
  const diff = Math.floor((new Date() - new Date(ds)) / 60000);
  if (diff < 60) return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

function getTempoColor(ds) {
  const diff = Math.floor((new Date() - new Date(ds)) / 60000);
  if (diff > 120) return "text-red-400";
  if (diff > 60) return "text-amber-400";
  return "text-emerald-400";
}

// ─── Menu de 3 pontos ─────────────────────────────────────────────────────────
function CardMenu({ onEstornar }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-[180px]"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEstornar(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" /> Cancelar / Estornar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Estorno Modal ─────────────────────────────────────────────────────────────
function EstornoModal({ pedido, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEstorno = async () => {
    if (!motivo.trim()) { setError("Motivo obrigatório."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/estornos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: pedido.id, motivo }),
      });
      if (res.ok) onSuccess();
      else { const d = await res.json(); setError(d.error || "Erro ao estornar."); }
    } catch { setError("Erro de conexão."); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={SPRING}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md p-6 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Estornar Pedido</h2>
            <p className="text-xs font-mono text-slate-400">#{pedido.id.toString().padStart(4, '0')} · {pedido.user?.nome}</p>
          </div>
        </div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Motivo do Estorno</label>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          rows={3}
          className="w-full rounded-xl p-3 text-sm resize-none mb-4 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
          placeholder="Descreva o motivo..."
        />
        {error && <p className="text-red-400 text-xs font-bold mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition-all border border-slate-700">Cancelar</button>
          <button onClick={handleEstorno} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Undo2 className="w-4 h-4" /> Estornar</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Card Premium de Requisição ───────────────────────────────────────────────
const FilaCard = memo(function FilaCard({ pedido, tab, onAction, onEstornar }) {
  const totalItens = pedido.itens?.length || 0;
  const setor = pedido.setor || "Geral";
  const solicitante = pedido.operadorSolicitante || pedido.user?.nome || "—";
  const isPendente = tab === "PENDENTES";
  const tempoColor = getTempoColor(pedido.createdAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={SPRING}
      className={`relative rounded-2xl mb-4 overflow-hidden border ${
        isPendente
          ? "bg-gradient-to-br from-slate-800 to-slate-850 border-slate-700/80"
          : "bg-gradient-to-br from-amber-950/40 to-slate-800 border-amber-700/40"
      }`}
      style={{
        boxShadow: isPendente
          ? "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 4px 24px rgba(251,146,60,0.12), inset 0 1px 0 rgba(255,255,255,0.05)"
      }}
    >
      {/* Barra lateral colorida */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
        isPendente ? "bg-blue-500" : "bg-amber-500"
      }`} />

      <div className="p-5 pl-6">
        {/* Linha 1: N° Pedido + Tempo + Setor + Menu */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className={`font-black text-base tracking-tight ${isPendente ? "text-blue-400" : "text-amber-400"}`}>
              #{pedido.id.toString().padStart(4, '0')}
            </span>
            <span className={`flex items-center text-[11px] font-bold gap-1 ${tempoColor}`}>
              <Clock className="w-3.5 h-3.5" />
              {getTempoEspera(pedido.createdAt)}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide truncate max-w-[130px] ${
              isPendente
                ? "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                : "bg-amber-500/15 text-amber-300 border border-amber-500/20"
            }`}>
              {setor}
            </span>
          </div>
          <CardMenu onEstornar={() => onEstornar(pedido)} />
        </div>

        {/* Linha 2: Solicitante + Total */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-sm text-white font-bold truncate pr-2">{solicitante}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-700/60 px-2.5 py-1 rounded-lg">
            <Layers className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-bold text-slate-300">
              {totalItens} {totalItens === 1 ? "item" : "itens"}
            </span>
          </div>
        </div>

        {/* Lista de Itens */}
        {totalItens > 0 && (
          <div className="mb-4 space-y-1.5 bg-slate-900/40 rounded-xl p-3">
            {pedido.itens.slice(0, 5).map(pi => (
              <div key={pi.id} className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPendente ? "bg-blue-500" : "bg-amber-500"}`} />
                <span className="font-black text-white">{pi.quantidade}×</span>
                <span className="truncate">{pi.item?.nome}</span>
              </div>
            ))}
            {totalItens > 5 && (
              <p className="text-[10px] font-bold text-slate-500 pl-3.5 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                + {totalItens - 5} {totalItens - 5 === 1 ? "item adicional" : "itens adicionais"}
              </p>
            )}
          </div>
        )}

        {/* Botão de Ação */}
        <div className="flex justify-end">
          {isPendente ? (
            <button
              onClick={() => onAction(pedido)}
              className="group relative px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.97]"
            >
              <Zap className="w-3.5 h-3.5" />
              Iniciar Separação
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => onAction(pedido)}
              className="group px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all duration-200 shadow-lg shadow-amber-600/30 hover:shadow-amber-500/40 active:scale-[0.97]"
            >
              <Camera className="w-3.5 h-3.5" />
              Continuar Checklist
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function AlmoxarifadoPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("PENDENTES");
  const [separacaoModal, setSeparacaoModal] = useState(null);
  const [estornoModal, setEstornoModal] = useState(null);

  const fetchPedidos = async () => {
    try {
      const res = await fetch('/api/pedidos');
      const data = await res.json();
      if (!data.error) setPedidos(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(() => {
      if (!updating && !separacaoModal && !estornoModal) fetchPedidos();
    }, 10000);
    return () => clearInterval(interval);
  }, [updating, separacaoModal, estornoModal]);

  const pendentes = pedidos.filter(p => p.status === 'AGUARDANDO_SEPARACAO');
  const emSeparacao = pedidos.filter(p => p.status === 'EM_SEPARACAO');
  const currentList = activeTab === "PENDENTES" ? pendentes : emSeparacao;

  const handleIniciarSeparacao = async (pedido) => {
    if (pedido.status === 'AGUARDANDO_SEPARACAO') {
      setUpdating(true);
      try {
        const res = await fetch('/api/pedidos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pedido.id, status: 'EM_SEPARACAO' }),
        });
        if (res.ok) {
          const updatedRes = await fetch('/api/pedidos');
          const updatedData = await updatedRes.json();
          const updatedPedido = updatedData.find(p => p.id === pedido.id);
          setPedidos(updatedData);
          setSeparacaoModal(updatedPedido || { ...pedido, status: 'EM_SEPARACAO' });
        }
      } catch (e) { console.error(e); }
      finally { setUpdating(false); }
    } else {
      setSeparacaoModal(pedido);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 animate-pulse" />
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 absolute top-3 left-3" />
          </div>
          <p className="text-sm font-bold text-slate-500">Carregando fila...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col max-w-2xl mx-auto overflow-hidden">

      {/* Header */}
      <div className="px-4 md:px-0 pt-1 pb-5 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <ClipboardList className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Fila de Requisições
          </h2>
        </div>
        <p className="text-slate-500 text-xs mt-0.5 font-medium pl-12">
          Selecione um pedido para iniciar a separação
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-0 mb-5 shrink-0">
        <div className="flex bg-slate-800/80 border border-slate-700/60 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("PENDENTES")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "PENDENTES"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            Pendentes
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              activeTab === "PENDENTES"
                ? "bg-white/20 text-white"
                : "bg-slate-700 text-slate-400"
            }`}>
              {pendentes.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("EM_SEPARACAO")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === "EM_SEPARACAO"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            Em Separação
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              activeTab === "EM_SEPARACAO"
                ? "bg-white/20 text-white"
                : "bg-slate-700 text-slate-400"
            }`}>
              {emSeparacao.length}
            </span>
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 md:px-0 flex-1 overflow-y-auto pb-8">
        <AnimatePresence mode="popLayout">
          {currentList.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-20 flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-slate-600" />
              </div>
              <p className="font-bold text-sm text-slate-500">
                {activeTab === "PENDENTES"
                  ? "Nenhuma requisição pendente"
                  : "Nenhuma separação em andamento"}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {activeTab === "PENDENTES"
                  ? "Novos pedidos aparecerão aqui automaticamente"
                  : "Inicie uma separação na aba Pendentes"}
              </p>
            </motion.div>
          ) : (
            currentList.map(pedido => (
              <FilaCard
                key={pedido.id}
                pedido={pedido}
                tab={activeTab}
                onAction={handleIniciarSeparacao}
                onEstornar={setEstornoModal}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Modal Checklist Digital */}
      <AnimatePresence>
        {separacaoModal && (
          <SeparacaoChecklistModal
            pedido={separacaoModal}
            onClose={() => setSeparacaoModal(null)}
            onSuccess={() => { setSeparacaoModal(null); fetchPedidos(); }}
          />
        )}
      </AnimatePresence>

      {/* Modal Estorno */}
      <AnimatePresence>
        {estornoModal && (
          <EstornoModal
            pedido={estornoModal}
            onClose={() => setEstornoModal(null)}
            onSuccess={() => { setEstornoModal(null); fetchPedidos(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
