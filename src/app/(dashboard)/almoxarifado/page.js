"use client";

import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, User as UserIcon, Package, ArrowRight, X, QrCode,
  CheckCircle2, AlertCircle, Undo2, Loader2, Camera,
  UserCheck, PackageCheck
} from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";

const SPRING = { type: "spring", stiffness: 280, damping: 24 };

const COLUMNS = [
  { id: "AGUARDANDO_SEPARACAO", title: "Aguardando",        accent: "#2563eb", bg: "#EFF6FF", border: "#BFDBFE", dot: "bg-blue-500"   },
  { id: "EM_SEPARACAO",         title: "Em Separação",      accent: "#d97706", bg: "#FFFBEB", border: "#FDE68A", dot: "bg-amber-500"  },
  { id: "PRONTO_RETIRADA",      title: "Pronto p/ Retirada",accent: "#7c3aed", bg: "#F5F3FF", border: "#DDD6FE", dot: "bg-violet-500" },
  { id: "ATENDIDO_PARCIALMENTE",title: "Parcial",           accent: "#ea580c", bg: "#FFF7ED", border: "#FED7AA", dot: "bg-orange-500" },
  { id: "CONCLUIDO",            title: "Entregue",          accent: "#16a34a", bg: "#F0FDF4", border: "#BBF7D0", dot: "bg-green-500"  },
];

function getTempoEspera(ds) {
  const diff = Math.floor((new Date() - new Date(ds)) / 60000);
  if (diff < 60)   return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
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
        className="site-card w-full max-w-md p-6 bg-white rounded-2xl shadow-xl"
      >
        <h2 className="text-lg font-display font-black text-slate-900 mb-1">Estornar Pedido</h2>
        <p className="text-xs font-mono text-slate-400 mb-4">Pedido #{pedido.id.toString().padStart(4, '0')} · {pedido.user?.nome}</p>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Motivo do Estorno</label>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          rows={3}
          className="site-input w-full rounded-xl p-3 text-sm resize-none mb-4 border border-slate-200 focus:border-red-400 focus:ring-1 focus:ring-red-400"
          placeholder="Descreva o motivo da devolução ou cancelamento..."
        />
        {error && <p className="text-red-600 text-xs font-bold mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border border-slate-200">Cancelar</button>
          <button onClick={handleEstorno} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Undo2 className="w-4 h-4" /> Estornar</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Modal Scanner QR Code ─────────────────────────────────────────────────────
function QRScannerModal({ item, pedidoId, onClose, onSuccess }) {
  const [scannedCode, setScannedCode] = useState(null);
  const [quantidade, setQuantidade] = useState(item.quantidade);
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScan = (result) => {
    if (result && result[0]) {
      const code = result[0].rawValue;
      if (code === item.item.codigo) {
        setScannedCode(code);
        setError("");
      } else {
        setError(`QR Code inválido. Esperado: ${item.item.codigo}, Lido: ${code}`);
      }
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pedidos/baixa-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId,
          itemId: item.itemId,
          quantidadeBaixa: quantidade,
          observacao_baixa: observacao
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || "Erro ao registrar baixa.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={SPRING}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" /> Baixa de Item
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-1">{item.item.nome}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {!scannedCode ? (
            <div className="flex flex-col items-center">
              <p className="text-sm font-bold text-slate-600 mb-4 text-center">
                Aponte a câmara para o QR Code do item <span className="text-indigo-600 font-black">{item.item.codigo}</span>
              </p>
              <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden border-4 border-indigo-100 shadow-inner bg-slate-900 relative">
                <Scanner onScan={handleScan} onError={(e) => console.error(e)} />
                <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20" />
                <div className="absolute inset-1/4 border-2 border-dashed border-white/50 rounded-lg animate-pulse" />
              </div>
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 text-center w-full">
                  <AlertCircle className="w-4 h-4 inline mr-1 -mt-0.5" /> {error}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-center font-black text-slate-800 text-lg mb-6">Item Reconhecido!</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1.5 block">Qtd a Baixar (Máx: {item.quantidade})</label>
                  <input
                    type="number"
                    min="1"
                    max={item.quantidade}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="w-full p-3.5 text-center text-lg font-black font-mono border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1.5 block">Observações (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Embalagem danificada..."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full p-3 text-sm border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>
                
                {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                
                <button
                  onClick={handleConfirm}
                  disabled={loading || quantidade < 1 || quantidade > item.quantidade}
                  className="w-full py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Baixa"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Modal Confirmar Entrega ao Funcionário ────────────────────────────────────
function EntregaModal({ pedido, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nomeSolicitante = pedido.operadorSolicitante || pedido.user?.nome || "Funcionário";

  const handleConfirmar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedido.id, status: 'CONCLUIDO' }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const d = await res.json();
        setError(d.error || 'Erro ao confirmar entrega.');
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={SPRING}
        onClick={e => e.stopPropagation()}
        className="site-card w-full max-w-md p-6 bg-white rounded-2xl shadow-xl"
      >
        {/* Ícone e título */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
            <UserCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-display font-black text-slate-900">Confirmar Entrega</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pedido <span className="font-mono font-bold text-slate-700">#{pedido.id.toString().padStart(4, '0')}</span>
          </p>
        </div>

        {/* Dados do solicitante */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Entregando para</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center font-black text-violet-700 text-lg">
              {nomeSolicitante.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-black text-slate-800 text-base">{nomeSolicitante}</p>
              <p className="text-xs text-slate-400 font-medium">Setor: {pedido.setor || 'Não informado'}</p>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Itens a Entregar</p>
          <div className="space-y-1.5 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
            {pedido.itens?.map(pi => (
              <div key={pi.id} className="flex items-center justify-between text-sm bg-white border border-slate-100 rounded-lg px-3 py-2">
                <span className="font-medium text-slate-700 truncate pr-2">{pi.item?.nome}</span>
                <span className="font-black text-slate-900 font-mono shrink-0">
                  {pi.quantidadeEnviada ?? pi.quantidade} <span className="text-slate-400 text-xs font-normal">{pi.item?.unidade}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-xs font-bold mb-3 text-center">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border border-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><PackageCheck className="w-4 h-4" /> Confirmar Entrega</>
            }
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Pedido Card (Mobile-First) ───────────────────────────────────────────────
const PedidoCardMobile = memo(function PedidoCardMobile({ pedido, onStatusChange, updating, onScannerModal, onEstornoModal, onEntregaModal }) {
  const col = COLUMNS.find(c => c.id === pedido.status) || COLUMNS[0];
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={SPRING}
      className={`bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden mb-4 ${updating ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between" style={{ background: col.bg }}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
          <span className="font-bold text-sm" style={{ color: col.accent }}>#{pedido.id.toString().padStart(4, '0')}</span>
        </div>
        <span className="flex items-center text-xs font-bold px-2.5 py-1 rounded-lg bg-white/60 text-slate-600">
          <Clock className="w-3.5 h-3.5 mr-1" />
          {getTempoEspera(pedido.createdAt)}
        </span>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h3 className="font-black text-slate-800 text-base">{pedido.operadorSolicitante || pedido.user?.nome}</h3>
          <p className="text-xs font-bold text-slate-400">Setor: {pedido.setor || "N/A"}</p>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1 sticky top-0 bg-white z-10 pt-1">Itens do Pedido</h4>
          {pedido.itens?.map(pi => {
            const isBaixado = !!pi.data_hora_baixa;
            return (
              <div key={pi.id} className={`flex flex-col p-3 rounded-xl border ${isBaixado ? 'bg-green-50/50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <p className={`text-sm font-bold ${isBaixado ? 'text-green-700' : 'text-slate-700'}`}>
                      {pi.item?.nome}
                    </p>
                    <p className="text-xs font-mono text-slate-500">{pi.item?.codigo} · Qtd Solicitada: {pi.quantidade}</p>
                  </div>
                  {isBaixado && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> BAIXADO ({pi.quantidadeEnviada})
                    </span>
                  )}
                </div>
                
                {/* Ação de Baixa somente Em Separação */}
                {!isBaixado && pedido.status === 'EM_SEPARACAO' && (
                  <button
                    onClick={() => onScannerModal(pi, pedido.id)}
                    className="mt-3 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wide rounded-lg flex items-center justify-center gap-2 border border-indigo-200 transition-colors"
                  >
                    <Camera className="w-4 h-4" /> Ler QR Code para Baixa
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 space-y-2">
          {pedido.status === 'AGUARDANDO_SEPARACAO' && (
            <button
              onClick={() => onStatusChange(pedido.id, 'EM_SEPARACAO')}
              className="w-full py-3.5 bg-blue-600 text-white font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 active:scale-95 transition-all"
            >
              Iniciar Separação <ArrowRight className="w-4 h-4" />
            </button>
          )}
          
          {pedido.status === 'EM_SEPARACAO' && (
            <button
              onClick={() => onStatusChange(pedido.id, 'PRONTO_RETIRADA')}
              className="w-full py-3.5 bg-violet-600 text-white font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-violet-700 active:scale-95 transition-all"
            >
              Separado p/ Retirada <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {pedido.status === 'PRONTO_RETIRADA' && (
            <button
              onClick={() => onEntregaModal(pedido)}
              className="w-full py-3.5 bg-emerald-600 text-white font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <UserCheck className="w-5 h-5" /> Confirmar Entrega ao Funcionário
            </button>
          )}

          {(pedido.status === 'PRONTO_RETIRADA' || pedido.status === 'EM_SEPARACAO') && (
            <button
              onClick={() => onEstornoModal(pedido)}
              className="w-full py-3 bg-red-50 text-red-600 font-bold text-sm rounded-xl border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all"
            >
              <Undo2 className="w-4 h-4" /> Cancelar / Estornar Pedido
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function AlmoxarifadoPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [activeTab, setActiveTab] = useState("AGUARDANDO_SEPARACAO");
  
  const [scannerModal, setScannerModal] = useState(null); // { item, pedidoId }
  const [estornoModal, setEstornoModal] = useState(null);
  const [entregaModal, setEntregaModal] = useState(null); // pedido completo

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
      if (!updating && !scannerModal && !estornoModal && !entregaModal) fetchPedidos();
    }, 10000);
    return () => clearInterval(interval);
  }, [updating, scannerModal, estornoModal, entregaModal]);

  const updatePedidoStatus = async (pedidoId, newStatus) => {
    setUpdating(true);
    const prev = [...pedidos];
    setPedidos(pedidos.map(p => p.id === pedidoId ? { ...p, status: newStatus } : p));

    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedidoId, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      fetchPedidos();
    } catch {
      setPedidos(prev);
    } finally {
      setUpdating(false);
    }
  };

  const now = new Date();
  const filtered = pedidos.filter(p => {
    if (p.status === 'CONCLUIDO' || p.status === 'ESTORNADO') {
      return (now - new Date(p.updatedAt || p.createdAt)) / 3600000 <= 24;
    }
    return true;
  });

  const currentPedidos = filtered.filter(p => p.status === activeTab);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col max-w-5xl mx-auto pb-4 md:pb-0">
      
      {/* Header Mobile-Friendly */}
      <div className="mb-6 px-4 md:px-0 shrink-0">
        <h2 className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight">Painel do Almoxarife</h2>
        <p className="text-slate-500 text-sm mt-1 font-medium">Controle de requisições e baixas por QR Code</p>
      </div>

      {/* Tabs (Scrollable on Mobile) */}
      <div className="overflow-x-auto custom-scrollbar px-4 md:px-0 mb-6 shrink-0">
        <div className="flex gap-2 min-w-max pb-2">
          {COLUMNS.map(col => {
            const count = filtered.filter(p => p.status === col.id).length;
            const isActive = activeTab === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveTab(col.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all border-2 ${
                  isActive 
                  ? 'bg-white shadow-md' 
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-100'
                }`}
                style={{ borderColor: isActive ? col.border : 'transparent', color: isActive ? col.accent : undefined }}
              >
                {col.title}
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'text-white' : 'bg-slate-200 text-slate-500'}`} style={{ background: isActive ? col.accent : undefined }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Listagem de Pedidos da Tab Ativa */}
      <div className="px-4 md:px-0 flex-1 overflow-y-auto custom-scrollbar pb-10">
        <AnimatePresence mode="popLayout">
          {currentPedidos.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center justify-center text-slate-300">
              <Package className="w-16 h-16 mb-4 opacity-50" />
              <p className="font-bold text-lg">Nenhum pedido nesta etapa</p>
            </motion.div>
          ) : (
            currentPedidos.map(pedido => (
              <PedidoCardMobile
                key={pedido.id}
                pedido={pedido}
                onStatusChange={updatePedidoStatus}
                updating={updating}
                onScannerModal={(item, pid) => setScannerModal({ item, pedidoId: pid })}
                onEstornoModal={setEstornoModal}
                onEntregaModal={setEntregaModal}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {scannerModal && (
          <QRScannerModal
            item={scannerModal.item}
            pedidoId={scannerModal.pedidoId}
            onClose={() => setScannerModal(null)}
            onSuccess={() => { setScannerModal(null); fetchPedidos(); }}
          />
        )}
      </AnimatePresence>

      {/* Estorno Modal */}
      <AnimatePresence>
        {estornoModal && (
          <EstornoModal
            pedido={estornoModal}
            onClose={() => setEstornoModal(null)}
            onSuccess={() => { setEstornoModal(null); fetchPedidos(); }}
          />
        )}
      </AnimatePresence>

      {/* Entrega Modal */}
      <AnimatePresence>
        {entregaModal && (
          <EntregaModal
            pedido={entregaModal}
            onClose={() => setEntregaModal(null)}
            onSuccess={() => { setEntregaModal(null); fetchPedidos(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
