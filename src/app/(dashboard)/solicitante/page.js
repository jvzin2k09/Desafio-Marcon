"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, ShoppingCart, Send, X, Clock, Package, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SPRING = { type: "spring", stiffness: 280, damping: 24 };

const STATUS_MAP = {
  AGUARDANDO_SEPARACAO: { label: "Aguardando", accent: "#2563eb", bg: "#EFF6FF", border: "#BFDBFE", dot: "bg-blue-500" },
  EM_SEPARACAO:         { label: "Em Separação", accent: "#d97706", bg: "#FFFBEB", border: "#FDE68A", dot: "bg-amber-500" },
  PRONTO_RETIRADA:      { label: "Pronto p/ Retirada", accent: "#16a34a", bg: "#F0FDF4", border: "#BBF7D0", dot: "bg-green-500" },
};

function getTempoEspera(ds) {
  const diff = Math.floor((new Date() - new Date(ds)) / 60000);
  if (diff < 60) return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

// Memoized ItemRow to eliminate unnecessary re-renders of the whole stock list on input
const ItemRow = memo(function ItemRow({ item, inCart, itemInputVal, onAddToCart, onUpdateCartQty, onSetCartQty, onBlurCartQty, onRemoveFromCart, onItemInputChange }) {
  return (
    <motion.div
      layout
      className="site-card flex items-center justify-between p-3 pl-4"
    >
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm font-bold text-slate-800 truncate">{item.nome}</p>
        <p className="text-xs font-mono text-slate-400 mt-0.5">
          {item.codigo} · {item.quantidade} {item.unidade} disponível · <span className="text-slate-300">{item.localizacao}</span>
        </p>
      </div>
      {inCart ? (
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <button 
            onClick={() => onUpdateCartQty(item.id, -1)} 
            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-xs transition-colors"
            title="Diminuir 1"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min={1}
            max={item.quantidade}
            value={inCart.quantidade}
            onChange={e => onSetCartQty(item.id, e.target.value)}
            onBlur={() => onBlurCartQty(item.id)}
            onFocus={e => e.target.select()}
            className="w-14 h-6 text-center font-mono font-black text-xs text-[#1B3A6B] bg-white border border-slate-200 focus:border-[#1B3A6B] rounded focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner"
            title={`No carrinho: ${inCart.quantidade} (Estoque: ${item.quantidade})`}
          />
          <button 
            onClick={() => onUpdateCartQty(item.id, 1)} 
            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-xs transition-colors"
            title="Aumentar 1"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onRemoveFromCart(item.id)} 
            className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-0.5"
            title="Remover do carrinho"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={item.quantidade}
            value={itemInputVal !== undefined ? itemInputVal : 1}
            onChange={e => onItemInputChange(item.id, e.target.value, item.quantidade)}
            onFocus={e => e.target.select()}
            disabled={item.quantidade === 0}
            className="w-14 h-8 text-center font-mono font-black text-xs text-slate-800 bg-slate-50 border border-slate-200 focus:border-[#1B3A6B] rounded-lg focus:outline-none disabled:opacity-30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner"
            placeholder="1"
            title={`Digite a quantidade desejada (Disponível: ${item.quantidade} ${item.unidade})`}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const qty = parseInt(itemInputVal, 10) || 1;
              onAddToCart(item, qty);
            }}
            disabled={item.quantidade === 0}
            className="btn-magnetic flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg text-white disabled:opacity-30 whitespace-nowrap shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </motion.button>
        </div>
      )}
    </motion.div>
  );
});

export default function SolicitantePage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState("pedido"); // pedido | status
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [itemInputs, setItemInputs] = useState({});
  const [setor, setSetor] = useState(session?.user?.setor || "");
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // null | success | error
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  // Buscar itens do estoque
  useEffect(() => {
    fetch("/api/items").then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  // Buscar pedidos do próprio operador
  useEffect(() => {
    if (tab === "status") {
      setLoadingPedidos(true);
      fetch("/api/pedidos")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMeusPedidos(data.filter(p => p.userId === parseInt(session?.user?.id) && p.status !== "CONCLUIDO" && p.status !== "ESTORNADO"));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingPedidos(false));
    }
  }, [tab, session?.user?.id]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(item =>
      item.nome.toLowerCase().includes(q) ||
      item.codigo.toLowerCase().includes(q)
    );
  }, [items, search]);

  const addToCart = useCallback((item, initialQty = 1) => {
    const qtyToAdd = Math.max(1, Math.min(parseInt(initialQty, 10) || 1, item.quantidade || 999999));
    setCart(prevCart => {
      const existing = prevCart.find(c => c.itemId === item.id);
      if (existing) {
        return prevCart.map(c => c.itemId === item.id ? { ...c, quantidade: Math.min(c.quantidade + qtyToAdd, c.maxQtd) } : c);
      } else {
        return [...prevCart, { itemId: item.id, nome: item.nome, codigo: item.codigo, unidade: item.unidade, quantidade: qtyToAdd, maxQtd: item.quantidade }];
      }
    });
  }, []);

  const updateCartQty = useCallback((itemId, delta) => {
    setCart(prevCart => prevCart.map(c => {
      if (c.itemId === itemId) {
        const currentQty = parseInt(c.quantidade, 10) || 0;
        const newQty = Math.max(1, currentQty + delta);
        return { ...c, quantidade: Math.min(newQty, c.maxQtd) };
      }
      return c;
    }));
  }, []);

  const setCartQty = useCallback((itemId, val) => {
    setCart(prevCart => prevCart.map(c => {
      if (c.itemId === itemId) {
        if (val === "" || val === null || val === undefined) {
          return { ...c, quantidade: "" };
        }
        const num = parseInt(val, 10);
        if (isNaN(num)) {
          return { ...c, quantidade: "" };
        }
        return { ...c, quantidade: Math.min(Math.max(1, num), c.maxQtd || 999999) };
      }
      return c;
    }));
  }, []);

  const handleBlurCartQty = useCallback((itemId) => {
    setCart(prevCart => prevCart.map(c => {
      if (c.itemId === itemId) {
        const num = parseInt(c.quantidade, 10);
        if (isNaN(num) || num <= 0) {
          return { ...c, quantidade: 1 };
        }
        return { ...c, quantidade: Math.min(num, c.maxQtd || 999999) };
      }
      return c;
    }));
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCart(prevCart => prevCart.filter(c => c.itemId !== itemId));
  }, []);

  const handleItemInputChange = useCallback((itemId, val, maxQty) => {
    if (val === "") {
      setItemInputs(prev => ({ ...prev, [itemId]: "" }));
    } else {
      const num = parseInt(val, 10);
      setItemInputs(prev => ({
        ...prev,
        [itemId]: isNaN(num) ? 1 : Math.max(1, Math.min(num, maxQty))
      }));
    }
  }, []);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setSubmitStatus(null);
    try {
      const res = await fetch("/api/pedidos/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: cart.map(c => ({ itemId: c.itemId, quantidade: Math.max(1, parseInt(c.quantidade, 10) || 1) })),
          setor: setor || null,
        }),
      });
      if (res.ok) {
        setSubmitStatus("success");
        setCart([]);
        setSearch("");
        setTimeout(() => setSubmitStatus(null), 3000);
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Módulo Solicitante</h2>
        <p className="text-slate-500 text-sm mt-1">Faça suas requisições de materiais de forma digital.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface-3)" }}>
        <button
          onClick={() => setTab("pedido")}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === "pedido" ? "bg-white text-slate-900 shadow-card" : "text-slate-500 hover:text-slate-700"}`}
        >
          <ShoppingCart className="w-4 h-4 inline mr-2 -mt-0.5" />
          Novo Pedido
        </button>
        <button
          onClick={() => setTab("status")}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === "status" ? "bg-white text-slate-900 shadow-card" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Clock className="w-4 h-4 inline mr-2 -mt-0.5" />
          Meus Pedidos
        </button>
      </div>

      {/* ─── Tab: Novo Pedido ─────────────────────────────────────── */}
      {tab === "pedido" && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          {/* Left: Search + Items */}
          <div className="flex-1 flex flex-col">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar item por nome ou código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="site-input w-full py-3 pl-11 pr-4 rounded-xl text-sm font-medium"
              />
            </div>

            {/* Setor */}
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Setor Solicitante</label>
              <input
                type="text"
                placeholder="Ex: Usinagem, Manutenção..."
                value={setor}
                onChange={e => setSetor(e.target.value)}
                className="site-input w-full py-2.5 px-4 rounded-lg text-sm"
              />
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">
                  {search ? "Nenhum item encontrado." : "Carregando itens..."}
                </div>
              )}
              {filteredItems.map(item => {
                const inCart = cart.find(c => c.itemId === item.id);
                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    inCart={inCart}
                    itemInputVal={itemInputs[item.id]}
                    onAddToCart={addToCart}
                    onUpdateCartQty={updateCartQty}
                    onSetCartQty={setCartQty}
                    onBlurCartQty={handleBlurCartQty}
                    onRemoveFromCart={removeFromCart}
                    onItemInputChange={handleItemInputChange}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="lg:w-80">
            <div className="site-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-display font-black text-slate-700 uppercase tracking-wide">Carrinho</h3>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full" style={{ background: "var(--surface-3)", color: "var(--primary)" }}>
                  {cart.length}
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-slate-400 font-medium">
                  <Package className="w-5 h-5 mr-2 opacity-40" />
                  Carrinho vazio
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  <AnimatePresence>
                    {cart.map(c => (
                      <motion.div
                        key={c.itemId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.nome}</p>
                          <p className="text-[10px] font-mono text-slate-400">{c.codigo}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => updateCartQty(c.itemId, -1)} 
                            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                            title="Diminuir 1"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={c.maxQtd}
                            value={c.quantidade}
                            onChange={e => setCartQty(c.itemId, e.target.value)}
                            onBlur={() => handleBlurCartQty(c.itemId)}
                            onFocus={e => e.target.select()}
                            className="w-16 h-7 text-center font-mono font-black text-sm text-slate-800 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#1B3A6B] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1B3A6B] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner"
                            title={`Digite a quantidade (Disponível: ${c.maxQtd} ${c.unidade})`}
                          />
                          <button 
                            onClick={() => updateCartQty(c.itemId, 1)} 
                            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                            title="Aumentar 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => removeFromCart(c.itemId)} 
                            className="w-7 h-7 rounded-md flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
                            title="Remover do carrinho"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleSubmit}
                disabled={cart.length === 0 || loading}
                className="btn-magnetic w-full text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm tracking-widest uppercase disabled:opacity-40 transition-all hover:shadow-primary-glow"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Requisição
                  </>
                )}
              </motion.button>

              {/* Feedback */}
              <AnimatePresence>
                {submitStatus === "success" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-green-700 text-xs font-bold bg-green-50 px-4 py-2.5 rounded-lg border border-green-100">
                    <CheckCircle2 className="w-4 h-4" /> Requisição enviada com sucesso!
                  </motion.div>
                )}
                {submitStatus === "error" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-red-700 text-xs font-bold bg-red-50 px-4 py-2.5 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4" /> Erro ao enviar. Tente novamente.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Meus Pedidos (Kanban) ───────────────────────────── */}
      {tab === "status" && (
        <div className="flex-1 overflow-x-auto pb-6">
          {loadingPedidos ? (
            <div className="flex justify-center items-center h-40">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
              </div>
            </div>
          ) : meusPedidos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-lg">Nenhum pedido ativo</p>
              <p className="text-sm mt-1">Faça um novo pedido para vê-lo aqui.</p>
            </div>
          ) : (
            <div className="flex gap-5 min-w-max items-start">
              {Object.entries(STATUS_MAP).map(([statusKey, col], colIdx) => {
                const pedidosCol = meusPedidos.filter(p => p.status === statusKey);
                return (
                  <motion.div
                    key={statusKey}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING, delay: colIdx * 0.07 }}
                    className="w-[310px] flex-shrink-0 flex flex-col rounded-2xl border" style={{ background: "var(--surface-2)", borderColor: "var(--border)", minHeight: 400 }}
                  >
                    <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: col.border }}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <h3 className="font-display font-black text-sm text-slate-700 uppercase tracking-wide">{col.label}</h3>
                      </div>
                      <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full border" style={{ background: col.bg, color: col.accent, borderColor: col.border }}>
                        {pedidosCol.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                      {pedidosCol.map(pedido => (
                        <motion.div
                          key={pedido.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="site-card p-4 pl-5 relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: col.accent }} />
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono font-bold text-slate-400">#{pedido.id.toString().padStart(4, '0')}</span>
                            <span className="flex items-center text-[10px] font-bold px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {getTempoEspera(pedido.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                            {pedido.itens?.slice(0, 3).map(i => `${i.quantidade}× ${i.item.nome}`).join(', ')}
                            {pedido.itens?.length > 3 && ` +${pedido.itens.length - 3}`}
                          </p>
                          {pedido.setor && (
                            <p className="text-[10px] font-bold text-slate-400 mt-2">Setor: {pedido.setor}</p>
                          )}
                        </motion.div>
                      ))}
                      {pedidosCol.length === 0 && (
                        <div className="h-28 flex items-center justify-center rounded-xl border-2 border-dashed" style={{ borderColor: "var(--border)" }}>
                          <p className="text-xs font-medium text-slate-400">— vazio —</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
