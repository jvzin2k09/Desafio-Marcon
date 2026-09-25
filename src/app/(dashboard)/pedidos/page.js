"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, User as UserIcon, Package, QrCode, ArrowRight, X } from "lucide-react";
import Link from "next/link";

// ─── Constantes ───────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    id: "PENDENTE", title: "Novos Pedidos",
    accent: "#2563eb", accentBg: "#EFF6FF", accentBorder: "#BFDBFE",
    dotClass: "bg-blue-500", textClass: "text-blue-700",
  },
  {
    id: "SEPARACAO", title: "Em Separação",
    accent: "#d97706", accentBg: "#FFFBEB", accentBorder: "#FDE68A",
    dotClass: "bg-amber-500", textClass: "text-amber-700",
  },
  {
    id: "CONFERENCIA", title: "Conferência",
    accent: "#7c3aed", accentBg: "#F5F3FF", accentBorder: "#DDD6FE",
    dotClass: "bg-violet-500", textClass: "text-violet-700",
  },
  {
    id: "CONCLUIDO", title: "Entregue",
    accent: "#16a34a", accentBg: "#F0FDF4", accentBorder: "#BBF7D0",
    dotClass: "bg-green-500", textClass: "text-green-700",
  },
];

const SPRING = { type: "spring", stiffness: 280, damping: 24 };

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── InputsSeparacao (card mini) ─────────────────────────────────────────────
function InputsSeparacao({ pedido, onQuantidadesChange }) {
  const [quantidades, setQuantidades] = useState(() => {
    const s = {};
    pedido.itens.forEach(pi => { s[pi.id] = pi.quantidadeEnviada ?? pi.quantidade; });
    return s;
  });
  const debouncedQtds = useDebounce(quantidades, 900);

  useEffect(() => {
    const items = Object.keys(debouncedQtds).map(id => ({ id, quantidadeEnviada: debouncedQtds[id] }));
    fetch('/api/pedidos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pedido.id, itensEnviados: items }),
    }).catch(() => {});
  }, [debouncedQtds, pedido.id]);

  const handleChange = (itemId, val) => {
    const newQtds = { ...quantidades, [itemId]: parseInt(val) || 0 };
    setQuantidades(newQtds);
    onQuantidadesChange?.(pedido.id, newQtds);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Qtd. Separada</p>
      {pedido.itens.map(pi => (
        <div key={pi.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
          <p className="text-[11px] font-medium text-slate-600 truncate flex-1 mr-2">
            <span className="font-bold text-amber-600 mr-1">[{pi.quantidade}]</span>
            {pi.item.nome}
          </p>
          <input
            type="number" min="0"
            onClick={e => e.stopPropagation()}
            value={quantidades[pi.id]}
            onChange={e => handleChange(pi.id, e.target.value)}
            className="w-12 text-center text-xs font-mono font-bold py-1 rounded bg-white border border-amber-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all"
          />
        </div>
      ))}
    </div>
  );
}

// ─── InputsSeparacaoModal (ampliado) ─────────────────────────────────────────
function InputsSeparacaoModal({ pedido, onQuantidadesChange }) {
  const [quantidades, setQuantidades] = useState(() => {
    const s = {};
    pedido.itens.forEach(pi => { s[pi.id] = pi.quantidadeEnviada ?? pi.quantidade; });
    return s;
  });
  const debouncedQtds = useDebounce(quantidades, 900);

  useEffect(() => {
    const items = Object.keys(debouncedQtds).map(id => ({ id, quantidadeEnviada: debouncedQtds[id] }));
    fetch('/api/pedidos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pedido.id, itensEnviados: items }),
    }).catch(() => {});
  }, [debouncedQtds, pedido.id]);

  const handleChange = (itemId, val) => {
    const newQtds = { ...quantidades, [itemId]: parseInt(val) || 0 };
    setQuantidades(newQtds);
    onQuantidadesChange?.(pedido.id, newQtds);
  };

  return (
    <div className="space-y-3">
      {pedido.itens.map(pi => (
        <div key={pi.id}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-sm"
        >
          <div className="flex-1 mb-3 sm:mb-0">
            <p className="text-base font-bold text-slate-800">{pi.item.nome}</p>
            <p className="text-sm font-mono text-slate-500 mt-0.5">
              Cód: {pi.item.codigo} · Solicitado: <span className="text-blue-600 font-bold">{pi.quantidade} un</span>
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-2 bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Separado:</span>
            <input
              type="number" min="0"
              value={quantidades[pi.id]}
              onChange={e => handleChange(pi.id, e.target.value)}
              className="w-24 text-center text-2xl font-mono font-black rounded-lg py-2 bg-white border-2 border-amber-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all text-slate-800"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────
function KanbanCard({ pedido, column, onStatusChange, setQuantidadesEnviadas, onOpenModal, updating }) {
  const getTempoEspera = (ds) => {
    const diff = Math.floor((new Date() - new Date(ds)) / 60000);
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={SPRING}
      whileHover={{ y: -2, boxShadow: "0 6px 24px rgba(27,58,107,0.12)" }}
      whileTap={{ scale: 0.98 }}
      className={`relative bg-white rounded-xl border border-slate-200 shadow-card cursor-grab active:cursor-grabbing overflow-hidden group transition-shadow ${updating ? 'pointer-events-none opacity-60' : ''}`}
    >
      {/* Barra lateral colorida */}
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: column.accent }} />

      <div className="p-4 pl-5">
        {/* Header */}
        <div
          className="flex justify-between items-start mb-3 cursor-pointer"
          onClick={() => column.id === 'SEPARACAO' && onOpenModal(pedido)}
        >
          <span className="text-xs font-mono font-bold text-slate-400">#{pedido.id.toString().padStart(4, '0')}</span>
          <span className="flex items-center text-[10px] font-bold px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500">
            <Clock className="w-3 h-3 mr-1" />
            {getTempoEspera(pedido.createdAt)}
          </span>
        </div>

        {/* Solicitante */}
        <div className="flex items-center mb-3">
          <UserIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" style={{ color: column.accent }} />
          <span className="text-sm font-bold text-slate-700 truncate">{pedido.user?.nome}</span>
        </div>

        {/* Itens */}
        {column.id === 'SEPARACAO' ? (
          <div className="relative">
            <InputsSeparacao
              pedido={pedido}
              onQuantidadesChange={(pid, qtds) => setQuantidadesEnviadas(prev => ({ ...prev, [pid]: qtds }))}
            />
            <button
              onClick={e => { e.stopPropagation(); onOpenModal(pedido); }}
              className="mt-2 w-full text-[10px] font-bold uppercase tracking-widest py-1.5 rounded-lg transition-all text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100"
            >
              ↗ Ampliar Vista
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
            {pedido.itens?.slice(0, 2).map(i => `${i.quantidade}× ${i.item.nome}`).join(', ')}
            {pedido.itens?.length > 2 && ` +${pedido.itens.length - 2}`}
          </p>
        )}

        {/* Ação */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          {column.id === 'PENDENTE' && (
            <button
              onClick={() => onStatusChange(pedido.id, 'SEPARACAO')}
              disabled={updating}
              className="flex items-center justify-between w-full text-xs font-bold disabled:opacity-40 transition-colors hover:opacity-80"
              style={{ color: column.accent }}
            >
              <span>Iniciar Separação</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {column.id === 'SEPARACAO' && (
            <button
              onClick={() => onStatusChange(pedido.id, 'CONFERENCIA')}
              disabled={updating}
              className="flex items-center justify-center w-full text-xs font-black py-2.5 rounded-lg disabled:opacity-40 transition-all hover:brightness-95"
              style={{ background: column.accentBg, border: `1px solid ${column.accentBorder}`, color: column.accent }}
            >
              Finalizar Separação
            </button>
          )}
          {column.id === 'CONFERENCIA' && (
            <Link
              href={`/pre-baixa/${pedido.id}`}
              className="flex items-center justify-center w-full text-xs font-black py-2.5 rounded-lg transition-all hover:brightness-95"
              style={{ background: "linear-gradient(135deg, #1B3A6B, #1e5fa8)", color: "white", boxShadow: "0 2px 8px rgba(27,58,107,0.3)" }}
            >
              <QrCode className="w-3.5 h-3.5 mr-2" />
              Escanear QR / Baixa
            </Link>
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
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function PedidosKanban() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [modalPedido, setModalPedido] = useState(null);
  const [quantidadesEnviadas, setQuantidadesEnviadas] = useState({});

  const fetchPedidos = async () => {
    try {
      const res = await fetch('/api/pedidos');
      const data = await res.json();
      if (!data.error) {
        setPedidos(data);
        const qs = {};
        data.forEach(p => {
          if (p.status === 'SEPARACAO') {
            qs[p.id] = {};
            p.itens.forEach(pi => { qs[p.id][pi.id] = pi.quantidadeEnviada ?? pi.quantidade; });
          }
        });
        setQuantidadesEnviadas(qs);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPedidos(); }, []);

  const handleDragStart = (e, pedido) => {
    setDraggedItem(pedido);
    e.dataTransfer.setData("pedidoId", pedido.id);
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.status === columnId || updating) return;
    await updatePedidoStatus(draggedItem.id, columnId);
  };

  const updatePedidoStatus = async (pedidoId, newStatus) => {
    setUpdating(true);
    const prev = [...pedidos];
    setPedidos(pedidos.map(p => p.id === pedidoId ? { ...p, status: newStatus } : p));
    setDraggedItem(null);

    let itensEnviados;
    if (newStatus === 'CONFERENCIA') {
      const qs = quantidadesEnviadas[pedidoId];
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

  const now = new Date();
  const filteredPedidos = pedidos.filter(p => {
    if (p.status === 'CONCLUIDO') {
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Fluxo de Requisições</h2>
        <p className="text-slate-500 text-sm mt-1">Arraste os pedidos entre colunas · {filteredPedidos.length} ativos</p>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto pb-6">
        <div className="flex gap-5 min-w-max items-start h-full">
          {COLUMNS.map((column, colIdx) => {
            const columnPedidos = filteredPedidos.filter(p => p.status === column.id);
            return (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: colIdx * 0.07 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, column.id)}
                className="w-[310px] flex-shrink-0 flex flex-col rounded-2xl bg-[#F0F4F8] border border-slate-200"
                style={{ minHeight: 480, maxHeight: "calc(100vh - 220px)" }}
              >
                {/* Column Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b"
                  style={{ borderColor: column.accentBorder }}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.dotClass}`} />
                    <h3 className="font-display font-black text-sm text-slate-700 uppercase tracking-wide">
                      {column.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full border"
                    style={{ background: column.accentBg, color: column.accent, borderColor: column.accentBorder }}>
                    {columnPedidos.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  <AnimatePresence>
                    {columnPedidos.map(pedido => (
                      <div key={pedido.id} draggable onDragStart={e => handleDragStart(e, pedido)}>
                        <KanbanCard
                          pedido={pedido}
                          column={column}
                          onStatusChange={updatePedidoStatus}
                          setQuantidadesEnviadas={setQuantidadesEnviadas}
                          onOpenModal={setModalPedido}
                          updating={updating}
                        />
                      </div>
                    ))}
                  </AnimatePresence>

                  {columnPedidos.length === 0 && (
                    <div className="h-28 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
                      <p className="text-xs font-medium text-slate-400">— vazio —</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalPedido && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setModalPedido(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={SPRING}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-5xl rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] shadow-2xl"
            >
              <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600 mb-1">Separação · Modo Foco</p>
                  <h3 className="text-2xl font-display font-black text-slate-900">Pedido #{modalPedido.id.toString().padStart(4, '0')}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Solicitante: <span className="font-bold text-slate-700">{modalPedido.user?.nome}</span>
                  </p>
                </div>
                <button
                  onClick={() => setModalPedido(null)}
                  className="p-2.5 rounded-xl hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-5">
                  Lista de Separação — {modalPedido.itens.length} SKUs
                </p>
                <InputsSeparacaoModal
                  pedido={modalPedido}
                  onQuantidadesChange={(pid, qtds) => setQuantidadesEnviadas(prev => ({ ...prev, [pid]: qtds }))}
                />
              </div>

              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setModalPedido(null)}
                  className="btn-magnetic px-8 py-3 font-black text-sm rounded-xl text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #1B3A6B, #1e5fa8)", boxShadow: "0 4px 16px rgba(27,58,107,0.25)" }}
                >
                  Concluído, fechar
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
