"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, User as UserIcon, Package, ArrowRight, X, Lock,
  CheckCircle2, AlertCircle, Undo2, Loader2,
  ChevronLeft, ChevronRight
} from "lucide-react";

const SPRING = { type: "spring", stiffness: 280, damping: 24 };
const CARDS_PER_PAGE = 5;

const COLUMNS = [
  { id: "AGUARDANDO_SEPARACAO", title: "Aguardando",        accent: "#2563eb", bg: "#EFF6FF", border: "#BFDBFE", dot: "bg-blue-500"   },
  { id: "EM_SEPARACAO",         title: "Em Separação",      accent: "#d97706", bg: "#FFFBEB", border: "#FDE68A", dot: "bg-amber-500"  },
  { id: "PRONTO_RETIRADA",      title: "Pronto p/ Retirada",accent: "#7c3aed", bg: "#F5F3FF", border: "#DDD6FE", dot: "bg-violet-500" },
  { id: "CONCLUIDO",            title: "Entregue",          accent: "#16a34a", bg: "#F0FDF4", border: "#BBF7D0", dot: "bg-green-500"  },
];

function getTempoEspera(ds) {
  const diff = Math.floor((new Date() - new Date(ds)) / 60000);
  if (diff < 60)   return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

// ─── InputsSeparacao (inline no card) ────────────────────────────────────────
const InputsSeparacao = memo(function InputsSeparacao({ pedido, onQtyChange }) {
  const [qtds, setQtds] = useState(() => {
    const s = {};
    pedido.itens?.forEach(pi => { s[pi.id] = pi.quantidadeEnviada ?? pi.quantidade; });
    return s;
  });
  const debouncedQtds = useDebounce(qtds, 900);

  useEffect(() => {
    const items = Object.keys(debouncedQtds).map(id => ({ id, quantidadeEnviada: debouncedQtds[id] }));
    fetch('/api/pedidos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pedido.id, itensEnviados: items }),
    }).catch(() => {});
  }, [debouncedQtds, pedido.id]);

  const handleChange = (itemId, val) => {
    const nq = { ...qtds, [itemId]: parseInt(val) || 0 };
    setQtds(nq);
    onQtyChange?.(pedido.id, nq);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Qtd. Separada</p>
      {pedido.itens?.map(pi => (
        <div key={pi.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
          <p className="text-[11px] font-medium text-slate-600 truncate flex-1 mr-2">
            <span className="font-bold text-amber-600 mr-1">[{pi.quantidade}]</span>
            {pi.item?.nome}
          </p>
          <input
            type="number" min="0"
            onClick={e => e.stopPropagation()}
            value={qtds[pi.id]}
            onChange={e => handleChange(pi.id, e.target.value)}
            className="w-12 text-center text-xs font-mono font-bold py-1 rounded bg-white border border-amber-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all"
          />
        </div>
      ))}
    </div>
  );
});

// ─── PIN Validation Modal ─────────────────────────────────────────────────────
function PinBalcaoModal({ pedido, onClose, onSuccess }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) { setError("PIN deve ter 4 dígitos."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pedidos/validar-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: pedido.id, pin }),
      });
      const data = await res.json();
      if (res.ok) { onSuccess(); }
      else { setError(data.error || "Erro ao validar PIN."); setPin(""); inputRef.current?.focus(); }
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={SPRING}
        onClick={e => e.stopPropagation()}
        className="site-card w-full max-w-md p-8 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full mix-blend-multiply filter blur-3xl opacity-20" style={{ background: "var(--primary)" }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--surface-2)" }}>
            <Lock className="w-8 h-8" style={{ color: "var(--primary)" }} />
          </div>
          <h2 className="text-xl font-display font-black text-slate-900 mb-1">Confirmar Entrega</h2>
          <p className="text-xs font-mono text-slate-400 mb-1">Pedido #{pedido.id.toString().padStart(4, '0')}</p>
          <p className="text-sm text-slate-500 text-center mb-6">
            Solicite ao operador <span className="font-bold text-slate-700">{pedido.user?.nome}</span> que digite seu PIN de 4 dígitos.
          </p>
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              className="site-input w-full max-w-xs text-center text-4xl tracking-[1em] font-mono py-4 rounded-xl"
              placeholder="****"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              disabled={loading}
            />
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mt-4 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" /> {error}
              </motion.div>
            )}
            <div className="flex gap-3 w-full mt-6">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border" style={{ borderColor: "var(--border)" }}>
                Cancelar
              </button>
              <motion.button
                type="submit"
                disabled={pin.length !== 4 || loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
              >
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <><CheckCircle2 className="w-4 h-4" /> Validar</>}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={SPRING}
        onClick={e => e.stopPropagation()}
        className="site-card w-full max-w-md p-6"
      >
        <h2 className="text-lg font-display font-black text-slate-900 mb-1">Estornar Pedido</h2>
        <p className="text-xs font-mono text-slate-400 mb-4">Pedido #{pedido.id.toString().padStart(4, '0')} · {pedido.user?.nome}</p>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Motivo do Estorno</label>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          rows={3}
          className="site-input w-full rounded-xl p-3 text-sm resize-none mb-4"
          placeholder="Descreva o motivo da devolução ou cancelamento..."
        />
        {error && <p className="text-red-600 text-xs font-bold mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border" style={{ borderColor: "var(--border)" }}>Cancelar</button>
          <button onClick={handleEstorno} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Undo2 className="w-4 h-4" /> Estornar</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
const KanbanCard = memo(function KanbanCard({ pedido, column, onStatusChange, onQtyChange, updating, onPinModal, onEstornoModal }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={SPRING}
      whileHover={{ y: -2, boxShadow: "0 6px 24px rgba(27,58,107,0.12)" }}
      className={`relative bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden group transition-shadow ${updating ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: column.accent }} />

      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-mono font-bold text-slate-400">#{pedido.id.toString().padStart(4, '0')}</span>
          <span className="flex items-center text-[10px] font-bold px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500">
            <Clock className="w-3 h-3 mr-1" />
            {getTempoEspera(pedido.createdAt)}
          </span>
        </div>

        <div className="flex items-center mb-1">
          <UserIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" style={{ color: column.accent }} />
          <span className="text-sm font-bold text-slate-700 truncate">{pedido.user?.nome}</span>
        </div>
        {pedido.setor && <p className="text-[10px] font-bold text-slate-400 mb-2">Setor: {pedido.setor}</p>}

        {column.id === 'EM_SEPARACAO' ? (
          <InputsSeparacao pedido={pedido} onQtyChange={onQtyChange} />
        ) : (
          <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
            {pedido.itens?.slice(0, 2).map(i => `${i.quantidade}× ${i.item.nome}`).join(', ')}
            {pedido.itens?.length > 2 && ` +${pedido.itens.length - 2}`}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          {column.id === 'AGUARDANDO_SEPARACAO' && (
            <button
              onClick={() => onStatusChange(pedido.id, 'EM_SEPARACAO')}
              disabled={updating}
              className="flex items-center justify-between w-full text-xs font-bold disabled:opacity-40 transition-colors hover:opacity-80"
              style={{ color: column.accent }}
            >
              <span>Iniciar Separação</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {column.id === 'EM_SEPARACAO' && (
            <button
              onClick={() => onStatusChange(pedido.id, 'PRONTO_RETIRADA')}
              disabled={updating}
              className="flex items-center justify-center w-full text-xs font-black py-2.5 rounded-lg disabled:opacity-40 transition-all hover:brightness-95"
              style={{ background: column.bg, border: `1px solid ${column.border}`, color: column.accent }}
            >
              Finalizar Separação
            </button>
          )}
          {column.id === 'PRONTO_RETIRADA' && (
            <div className="space-y-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPinModal(pedido)}
                className="btn-magnetic flex items-center justify-center w-full text-xs font-black py-2.5 rounded-lg text-white transition-all"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))", boxShadow: "0 2px 8px rgba(27,58,107,0.3)" }}
              >
                <Lock className="w-3.5 h-3.5 mr-2" />
                Confirmar Entrega (PIN)
              </motion.button>
              <button
                onClick={() => onEstornoModal(pedido)}
                className="flex items-center justify-center w-full text-[10px] font-bold py-1.5 rounded-lg text-red-500 hover:bg-red-50 border border-red-100 transition-all"
              >
                <Undo2 className="w-3 h-3 mr-1" /> Estornar
              </button>
            </div>
          )}
          {column.id === 'CONCLUIDO' && (
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {pedido.itens?.length} itens
              </span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">✓ Entregue</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ─── Controles de Paginação da Coluna ────────────────────────────────────────
function ColunaPaginacao({ currentPage, totalPages, onPage, accent, bg, border }) {
  if (totalPages <= 1) return null;
  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-t mx-3 mb-3 mt-1 rounded-b-xl"
      style={{ borderColor: border, background: bg }}
    >
      <button
        onClick={() => onPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:brightness-90"
        style={{ background: "white", border: `1px solid ${border}`, color: accent }}
        title="Página anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <span className="text-[11px] font-mono font-black" style={{ color: accent }}>
        {currentPage} / {totalPages}
      </span>

      <button
        onClick={() => onPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:brightness-90"
        style={{ background: "white", border: `1px solid ${border}`, color: accent }}
        title="Próxima página"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function AlmoxarifadoPage() {
  const [pedidos, setPedidos]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [updating, setUpdating]           = useState(false);
  const [pinModal, setPinModal]           = useState(null);
  const [estornoModal, setEstornoModal]   = useState(null);
  const [qtyMap, setQtyMap]               = useState({});

  // Página atual de cada coluna: { AGUARDANDO_SEPARACAO: 1, EM_SEPARACAO: 1, ... }
  const [colunaPages, setColunaPages] = useState(() =>
    Object.fromEntries(COLUMNS.map(c => [c.id, 1]))
  );

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
      if (!updating && !pinModal && !estornoModal) fetchPedidos();
    }, 15000);
    return () => clearInterval(interval);
  }, [updating, pinModal, estornoModal]);

  const updatePedidoStatus = async (pedidoId, newStatus) => {
    setUpdating(true);
    const prev = [...pedidos];
    setPedidos(pedidos.map(p => p.id === pedidoId ? { ...p, status: newStatus } : p));

    let itensEnviados;
    if (newStatus === 'PRONTO_RETIRADA') {
      const qs = qtyMap[pedidoId];
      if (qs) itensEnviados = Object.keys(qs).map(id => ({ id, quantidadeEnviada: qs[id] }));
    }

    try {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedidoId, status: newStatus, itensEnviados }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPedidos(prev);
    } finally {
      setUpdating(false);
    }
  };

  const setPageForColumn = (colId, updater) => {
    setColunaPages(prev => ({ ...prev, [colId]: typeof updater === "function" ? updater(prev[colId]) : updater }));
  };

  const now = new Date();
  const filtered = pedidos.filter(p => {
    if (p.status === 'CONCLUIDO' || p.status === 'ESTORNADO') {
      return (now - new Date(p.updatedAt || p.createdAt)) / 3600000 <= 24;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Fila de Atendimento</h2>
        <p className="text-slate-500 text-sm mt-1">
          Gerencie as requisições de todos os setores · {filtered.length} pedidos
        </p>
      </div>

      <div className="flex-1 overflow-x-auto pb-6">
        <div className="flex gap-5 min-w-max items-start h-full">
          {COLUMNS.map((column, colIdx) => {
            const colPedidos   = filtered.filter(p => p.status === column.id);
            const totalPages   = Math.max(1, Math.ceil(colPedidos.length / CARDS_PER_PAGE));
            const currentPage  = Math.min(colunaPages[column.id] ?? 1, totalPages);
            const pageStart    = (currentPage - 1) * CARDS_PER_PAGE;
            const pagePedidos  = colPedidos.slice(pageStart, pageStart + CARDS_PER_PAGE);

            return (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: colIdx * 0.07 }}
                className="w-[310px] flex-shrink-0 flex flex-col rounded-2xl border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", minHeight: 480, maxHeight: "calc(100vh - 220px)" }}
              >
                {/* Cabeçalho da coluna */}
                <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: column.border }}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.dot}`} />
                    <h3 className="font-display font-black text-sm text-slate-700 uppercase tracking-wide">{column.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Badge total de pedidos */}
                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full border" style={{ background: column.bg, color: column.accent, borderColor: column.border }}>
                      {colPedidos.length}
                    </span>
                    {/* Indicador de página se houver mais de 1 */}
                    {totalPages > 1 && (
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        pág {currentPage}/{totalPages}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards com scroll se necessário dentro da página */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {pagePedidos.map(pedido => (
                      <KanbanCard
                        key={pedido.id}
                        pedido={pedido}
                        column={column}
                        onStatusChange={updatePedidoStatus}
                        onQtyChange={(pid, qtds) => setQtyMap(prev => ({ ...prev, [pid]: qtds }))}
                        updating={updating}
                        onPinModal={setPinModal}
                        onEstornoModal={setEstornoModal}
                      />
                    ))}
                  </AnimatePresence>

                  {colPedidos.length === 0 && (
                    <div className="h-28 flex items-center justify-center rounded-xl border-2 border-dashed" style={{ borderColor: "var(--border)" }}>
                      <p className="text-xs font-medium text-slate-400">— vazio —</p>
                    </div>
                  )}
                </div>

                {/* Paginação no rodapé da coluna */}
                <ColunaPaginacao
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPage={(updater) => setPageForColumn(column.id, updater)}
                  accent={column.accent}
                  bg={column.bg}
                  border={column.border}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* PIN Modal */}
      <AnimatePresence>
        {pinModal && (
          <PinBalcaoModal
            pedido={pinModal}
            onClose={() => setPinModal(null)}
            onSuccess={() => { setPinModal(null); fetchPedidos(); }}
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
    </div>
  );
}
