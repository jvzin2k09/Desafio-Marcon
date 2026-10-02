"use client";

import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, X, Undo2, Loader2, Camera, ArrowRight,
  ClipboardList, MoreVertical, AlertTriangle
} from "lucide-react";
import { SeparacaoChecklistModal } from "./SeparacaoChecklistModal";

const SPRING = { type: "spring", stiffness: 280, damping: 24 };

function getTempoEspera(ds) {
  const diff = Math.floor((new Date() - new Date(ds)) / 60000);
  if (diff < 60) return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

// ─── Menu de 3 pontos (Ações Secundárias) ─────────────────────────────────────
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
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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
            className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[180px]"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEstornar(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" /> Cancelar / Estornar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Estorno Modal ────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={SPRING}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Estornar Pedido</h2>
            <p className="text-xs font-mono text-slate-400">#{pedido.id.toString().padStart(4, '0')} · {pedido.user?.nome}</p>
          </div>
        </div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Motivo do Estorno</label>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          rows={3}
          className="w-full rounded-xl p-3 text-sm resize-none mb-4 border border-slate-200 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
          placeholder="Descreva o motivo..."
        />
        {error && <p className="text-red-600 text-xs font-bold mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border border-slate-200">Cancelar</button>
          <button onClick={handleEstorno} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Undo2 className="w-4 h-4" /> Estornar</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Card Compacto de Requisição ──────────────────────────────────────────────
const FilaCard = memo(function FilaCard({ pedido, tab, onAction, onEstornar }) {
  const totalItens = pedido.itens?.length || 0;
  const setor = pedido.setor || "Geral";
  const solicitante = pedido.operadorSolicitante || pedido.user?.nome || "—";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={SPRING}
      className="bg-white rounded-2xl p-4 shadow-sm border-2 border-slate-100 mb-3"
    >
      {/* Linha 1: N° Pedido + Tempo + Setor + Menu */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-black text-slate-800 text-sm">
            #{pedido.id.toString().padStart(4, '0')}
          </span>
          <span className="flex items-center text-[10px] font-bold text-slate-400 gap-0.5">
            <Clock className="w-3 h-3" />
            {getTempoEspera(pedido.createdAt)}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wide truncate max-w-[120px]">
            {setor}
          </span>
        </div>
        <CardMenu onEstornar={() => onEstornar(pedido)} />
      </div>

      {/* Linha 2: Solicitante */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-700 font-bold truncate pr-2">{solicitante}</p>
        <span className="text-xs font-bold text-slate-400 shrink-0">
          {totalItens} {totalItens === 1 ? "Item" : "Itens"}
        </span>
      </div>

      {/* Lista curta de Itens */}
      {totalItens > 0 && (
        <div className="mb-4 space-y-1.5">
          {pedido.itens.filter(pi => pi.qtd_caixas_central > 0).slice(0, 5).map(pi => (
            <div key={pi.id} className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
              <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
              <span className="font-bold text-slate-700">{pi.qtd_caixas_central} Cx(s)</span> {pi.item?.nome}
            </div>
          ))}
          {totalItens > 5 && (
            <p className="text-[10px] font-bold text-slate-400 mt-1 pl-2.5">
              + {totalItens - 5} {totalItens - 5 === 1 ? "item" : "itens"} (ver no checklist)
            </p>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex justify-end mt-2">
        {tab === "PENDENTES" ? (
          <button
            onClick={() => onAction(pedido)}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-wide rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.97] transition-all shadow-md shadow-blue-600/20"
          >
            Iniciar Separação <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => onAction(pedido)}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 text-white font-bold text-xs uppercase tracking-wide rounded-lg flex items-center justify-center gap-1.5 hover:bg-amber-700 active:scale-[0.97] transition-all shadow-md shadow-amber-600/20"
          >
            <Camera className="w-4 h-4" /> Continuar Checklist
          </button>
        )}
      </div>
    </motion.div>
  );
});

// ─── Página Principal ─────────────────────────────────────────────────────────
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

  // Filtra por aba (Ignora pedidos que são 100% resolvidos pelo Estoque Alternativo)
  const pendentes = pedidos.filter(p => p.status === 'AGUARDANDO_SEPARACAO' && p.itens?.some(pi => pi.qtd_caixas_central > 0));
  const emSeparacao = pedidos.filter(p => p.status === 'EM_SEPARACAO' && p.itens?.some(pi => pi.qtd_caixas_central > 0));
  const currentList = activeTab === "PENDENTES" ? pendentes : emSeparacao;

  // Iniciar separação: muda status e abre modal
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
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col max-w-2xl mx-auto overflow-hidden">

      {/* Header */}
      <div className="px-4 md:px-0 pt-1 pb-4 shrink-0">
        <h2 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight">
          Fila de Requisições
        </h2>
        <p className="text-slate-400 text-xs mt-0.5 font-medium">
          Selecione um pedido para iniciar a separação
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-0 mb-4 shrink-0">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("PENDENTES")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "PENDENTES"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Pendentes
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "PENDENTES"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-500"
            }`}>
              {pendentes.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("EM_SEPARACAO")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "EM_SEPARACAO"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Em Separação
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === "EM_SEPARACAO"
                ? "bg-amber-600 text-white"
                : "bg-slate-200 text-slate-500"
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 flex flex-col items-center justify-center text-slate-300"
            >
              <ClipboardList className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-bold text-sm text-slate-400">
                {activeTab === "PENDENTES"
                  ? "Nenhuma requisição pendente"
                  : "Nenhuma separação em andamento"}
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
