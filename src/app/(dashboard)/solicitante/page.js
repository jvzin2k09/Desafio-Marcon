"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, ShoppingCart, Send, X, Clock, Package, Loader2, CheckCircle2, AlertCircle, User as UserIcon, Info, MapPin } from "lucide-react";

const SPRING = { type: "spring", stiffness: 280, damping: 24 };

const STATUS_MAP = {
  AGUARDANDO_SEPARACAO: { label: "Aguardando", accent: "#2563eb", bg: "#EFF6FF", border: "#BFDBFE", dot: "bg-blue-500" },
  EM_SEPARACAO: { label: "Em Separação", accent: "#d97706", bg: "#FFFBEB", border: "#FDE68A", dot: "bg-amber-500" },
  PRONTO_RETIRADA: { label: "Pronto p/ Retirada", accent: "#16a34a", bg: "#F0FDF4", border: "#BBF7D0", dot: "bg-green-500" },
};

function getTempoEspera(ds) {
  const diff = Math.floor((new Date() - new Date(ds)) / 60000);
  if (diff < 60) return `${diff}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

export default function SolicitantePage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState("pedido"); // pedido | status
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [itemInputs, setItemInputs] = useState({});
  const [setor, setSetor] = useState(session?.user?.setor || "");
  const [operadorSolicitante, setOperadorSolicitante] = useState("");
  const [ordemProducao, setOrdemProducao] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // null | success | error
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [infoVisible, setInfoVisible] = useState({});

  // Buscar itens do estoque
  useEffect(() => {
    fetch("/api/items").then(r => r.json()).then(setItems).catch(() => { });
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
        .catch(() => { })
        .finally(() => setLoadingPedidos(false));
    }
  }, [tab, session?.user?.id]);

  const filteredItems = items.filter(item =>
    item.nome.toLowerCase().includes(search.toLowerCase()) ||
    item.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item, initialQty) => {
    const step = item.qtd_por_caixa || 1;
    let qtyToAdd = initialQty ? parseInt(initialQty, 10) : step;
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) qtyToAdd = step;
    qtyToAdd = Math.ceil(qtyToAdd / step) * step;
    qtyToAdd = Math.max(step, Math.min(qtyToAdd, item.quantidade || 999999));

    const existing = cart.find(c => c.itemId === item.id);
    if (existing) {
      setCart(cart.map(c => {
        if (c.itemId === item.id) {
          let newQty = c.quantidade + qtyToAdd;
          newQty = Math.ceil(newQty / c.step) * c.step;
          return { ...c, quantidade: Math.min(newQty, c.maxQtd) };
        }
        return c;
      }));
    } else {
      setCart([...cart, { itemId: item.id, nome: item.nome, codigo: item.codigo, unidade: item.unidade, quantidade: qtyToAdd, maxQtd: item.quantidade, step }]);
    }
  };

  const updateCartQty = (itemId, deltaMultiplier) => {
    setCart(cart.map(c => {
      if (c.itemId === itemId) {
        const delta = c.step * deltaMultiplier;
        const currentQty = parseInt(c.quantidade, 10) || 0;
        let newQty = currentQty + delta;
        newQty = Math.ceil(newQty / c.step) * c.step;
        newQty = Math.max(c.step, newQty);
        return { ...c, quantidade: Math.min(newQty, c.maxQtd) };
      }
      return c;
    }));
  };

  const setCartQty = (itemId, val) => {
    setCart(cart.map(c => {
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
  };

  const handleBlurCartQty = (itemId) => {
    setCart(cart.map(c => {
      if (c.itemId === itemId) {
        const num = parseInt(c.quantidade, 10);
        if (isNaN(num) || num <= 0) {
          return { ...c, quantidade: c.step };
        }
        let newQty = Math.ceil(num / c.step) * c.step;
        return { ...c, quantidade: Math.min(newQty, c.maxQtd || 999999) };
      }
      return c;
    }));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(c => c.itemId !== itemId));
  };

  const [showOperatorModal, setShowOperatorModal] = useState(false);

  const handleOpenModal = () => {
    if (cart.length === 0) return;
    setShowOperatorModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (cart.length === 0) return;
    if (!operadorSolicitante.trim()) {
      setSubmitStatus("error_operador");
      setTimeout(() => setSubmitStatus(null), 3000);
      document.getElementById("operadorSolicitante")?.focus();
      return;
    }
    setLoading(true);
    setSubmitStatus(null);
    try {
      const res = await fetch("/api/pedidos/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: cart.map(c => ({ itemId: c.itemId, quantidade: Math.max(1, parseInt(c.quantidade, 10) || 1) })),
          setor: setor || null,
          operadorSolicitante: operadorSolicitante.trim(),
          ordem_producao: ordemProducao.trim() || null,
        }),
      });
      if (res.ok) {
        setSubmitStatus("success");

        // Atualização otimista do estoque local para remover o delay da tela
        setItems(prevItems => prevItems.map(item => {
          const cartItem = cart.find(c => c.itemId === item.id);
          if (cartItem) {
            return { ...item, quantidade: Math.max(0, item.quantidade - (parseInt(cartItem.quantidade, 10) || 1)) };
          }
          return item;
        }));

        setCart([]);
        setSearch("");
        setOperadorSolicitante("");
        setOrdemProducao("");
        setShowOperatorModal(false);
        // Refresh items stock ignorando cache
        fetch("/api/items", { cache: "no-store" }).then(r => r.json()).then(setItems).catch(() => { });
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
    <div className="h-[calc(100vh-80px)] flex flex-col space-y-2 md:space-y-6 overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <h2 className="text-lg md:text-2xl font-display font-black text-slate-900 tracking-tight">Módulo Solicitante</h2>
        <p className="text-slate-500 text-sm mt-1 hidden md:block">Faça suas requisições de materiais de forma digital.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl shrink-0" style={{ background: "var(--surface-3)" }}>
        <button
          onClick={() => setTab("pedido")}
          className={`flex-1 py-2 md:py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${tab === "pedido" ? "bg-white text-slate-900 shadow-card" : "text-slate-500 hover:text-slate-700"}`}
        >
          <ShoppingCart className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Novo Pedido
        </button>
        <button
          onClick={() => setTab("status")}
          className={`flex-1 py-2 md:py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${tab === "status" ? "bg-white text-slate-900 shadow-card" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Meus Pedidos
        </button>
      </div>

      {/* ─── Tab: Novo Pedido ─────────────────────────────────────── */}
      {tab === "pedido" && (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">
          {/* Left: Search + Items */}
          <div className="flex-1 flex flex-col min-h-0 lg:overflow-hidden">
            {/* Search + Setor em linha no mobile */}
            <div className="relative mb-2 md:mb-4 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar item por nome ou código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="site-input w-full py-2.5 md:py-3 pl-11 pr-4 rounded-xl text-sm font-medium"
              />
            </div>

            {/* Setor Solicitante - Filtros */}
            <div className="mb-2 md:mb-4 shrink-0">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Setor Solicitante (Filtro)</label>
              <div className="flex flex-wrap gap-1.5 md:grid md:grid-cols-4 md:gap-2">
                {[
                  { value: "Usinagem", label: "Usinagem", color: "#0072BC" },
                  { value: "Logística", label: "Logística", color: "#008C45" },
                  { value: "Manutenção", label: "Manutenção", color: "#D32027" },
                  { value: "Montagem", label: "Montagem", color: "#D4A017" },
                ].map(linha => (
                  <button
                    key={linha.value}
                    type="button"
                    onClick={() => setSetor(setor === linha.value ? "" : linha.value)}
                    style={setor === linha.value ? { backgroundColor: linha.color, borderColor: linha.color, color: 'white' } : {}}
                    className={`rounded-lg px-3 py-1.5 md:rounded-xl md:px-2 md:py-3 border-2 transition-all duration-200 flex items-center justify-center font-bold text-xs md:text-sm ${setor === linha.value
                        ? "shadow-lg scale-[1.02]"
                        : "border-slate-200 text-slate-600 bg-white hover:border-slate-300 hover:shadow-sm hover:bg-slate-50"
                      }`}
                  >
                    {linha.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Grid - com scroll fixo */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">
                  {search ? "Nenhum item encontrado." : "Carregando itens..."}
                </div>
              )}
              {filteredItems.map(item => {
                const inCart = cart.find(c => c.itemId === item.id);
                // Mapear item à sua linha Marcon baseado no tipo de produto
                const linhaMap = {
                  'TM-001': 'Usinagem', 'TM-002': 'Usinagem', 'TM-003': 'Usinagem',
                  'TM-004': 'Usinagem', 'TM-005': 'Usinagem',
                  'TM-006': 'Montagem', 'TM-007': 'Montagem', 'TM-008': 'Montagem',
                  'TM-009': 'Manutenção', 'TM-010': 'Manutenção',
                };

                // Mapear setor para as logos das linhas
                const logoMap = {
                  'Usinagem': '/logomecanica.png',
                  'Logística': '/logomovimento.png',
                  'Manutenção': '/logohidraulica.png',
                  'Montagem': '/logopratika.png'
                };

                const linhaColors = {
                  'Usinagem': { bg: '#EBF5FF', border: '#0072BC', dot: '#0072BC' },
                  'Logística': { bg: '#E8F5E9', border: '#008C45', dot: '#008C45' },
                  'Manutenção': { bg: '#FFEBEE', border: '#D32027', dot: '#D32027' },
                  'Montagem': { bg: '#FFF8E1', border: '#D4A017', dot: '#D4A017' },
                };
                const itemLinha = linhaMap[item.codigo] || 'Logística'; // Logística como fallback

                // Ocultar se estivermos filtrando por um setor específico e este item não pertencer
                if (setor && itemLinha !== setor) return null;

                const linhaStyle = linhaColors[itemLinha];
                const logoImg = logoMap[itemLinha];

                return (
                  <motion.div
                    key={item.id}
                    layout
                    className="bg-white rounded-xl shadow-sm border border-slate-200 mb-3 relative overflow-visible flex min-h-[110px]"
                  >
                    {/* Barra lateral colorida da linha */}
                    {linhaStyle && (
                      <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-xl z-10" style={{ background: linhaStyle.dot }} />
                    )}

                    <div className="flex-1 min-w-0 p-3 pl-4 flex flex-col justify-between h-full">

                      {/* LINHA SUPERIOR */}
                      <div className="flex justify-between items-start w-full gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {logoImg && (
                            <div className="shrink-0 w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shadow-xs">
                              <img src={logoImg} alt={itemLinha} className="h-6 w-6 object-contain" />
                            </div>
                          )}
                          <p className="text-sm font-bold text-gray-800 truncate">{item.nome}</p>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap shrink-0">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {item.localizacao || 'S/L'}
                        </span>
                      </div>

                      {/* LINHA INTERMEDIÁRIA */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {item.codigo}
                        </span>

                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${item.quantidade > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {item.quantidade} {item.unidade} {item.qtd_por_caixa > 1 ? `(${Math.floor(item.quantidade / item.qtd_por_caixa)} Cxs)` : ''}
                        </span>

                        {item.qtd_por_caixa > 1 && (
                          <button 
                            onClick={() => setInfoVisible(prev => ({...prev, [item.id]: !prev[item.id]}))}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all border ${
                              infoVisible[item.id] 
                                ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200'
                            }`}
                          >
                            <Info className="w-3 h-3" />
                            <span className="hidden sm:inline">Saiba mais</span>
                          </button>
                        )}
                      </div>

                      {/* INFO INLINE EXPANSÍVEL */}
                      <AnimatePresence>
                        {infoVisible[item.id] && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 p-2.5 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-lg flex items-start gap-2">
                              <div className="shrink-0 w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center mt-0.5">
                                <Package className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <p className="text-[11px] text-blue-800 leading-relaxed">
                                <strong className="text-blue-900">Lote de Fornecimento:</strong> Este item é entregue em caixas de <strong>{item.qtd_por_caixa} UN</strong>. O saldo sobressalente vai diretamente para o seu Estoque Alternativo.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* LINHA INFERIOR (AÇÕES) */}
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
                        {inCart ? (
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 w-full justify-between">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateCartQty(item.id, -1)}
                                className="w-8 h-8 rounded-md flex items-center justify-center bg-white text-slate-500 shadow-sm hover:bg-slate-100 transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={item.quantidade}
                                value={inCart.quantidade}
                                onChange={e => setCartQty(item.id, e.target.value)}
                                onBlur={() => handleBlurCartQty(item.id)}
                                onFocus={e => e.target.select()}
                                className="w-12 h-8 text-center font-mono font-black text-sm text-[#1B3A6B] bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => updateCartQty(item.id, 1)}
                                className="w-8 h-8 rounded-md flex items-center justify-center bg-white text-slate-500 shadow-sm hover:bg-slate-100 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-8 h-8 rounded-md flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 transition-colors mr-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0">
                              <button
                                onClick={() => {
                                  const current = parseInt(itemInputs[item.id], 10) || (item.qtd_por_caixa || 1);
                                  const step = item.qtd_por_caixa || 1;
                                  const next = Math.max(step, current - step);
                                  setItemInputs(prev => ({ ...prev, [item.id]: next }));
                                }}
                                className="w-7 h-7 rounded flex items-center justify-center bg-white text-slate-500 shadow-sm hover:bg-slate-100 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={item.quantidade}
                                value={itemInputs[item.id] !== undefined ? itemInputs[item.id] : (item.qtd_por_caixa || 1)}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === "") {
                                    setItemInputs(prev => ({ ...prev, [item.id]: "" }));
                                  } else {
                                    const num = parseInt(val, 10);
                                    setItemInputs(prev => ({
                                      ...prev,
                                      [item.id]: isNaN(num) ? (item.qtd_por_caixa || 1) : Math.max(1, Math.min(num, item.quantidade))
                                    }));
                                  }
                                }}
                                onBlur={() => {
                                  const step = item.qtd_por_caixa || 1;
                                  const current = itemInputs[item.id];
                                  if (!current || parseInt(current, 10) <= 0) {
                                    setItemInputs(prev => ({ ...prev, [item.id]: step }));
                                  } else {
                                    const num = parseInt(current, 10);
                                    let newQty = Math.ceil(num / step) * step;
                                    newQty = Math.min(newQty, item.quantidade);
                                    setItemInputs(prev => ({ ...prev, [item.id]: newQty }));
                                  }
                                }}
                                onFocus={e => e.target.select()}
                                disabled={item.quantidade === 0}
                                className="w-10 h-7 text-center font-mono font-black text-sm text-slate-800 bg-transparent focus:outline-none disabled:opacity-30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder={(item.qtd_por_caixa || 1).toString()}
                              />
                              <button
                                onClick={() => {
                                  const current = parseInt(itemInputs[item.id], 10) || (item.qtd_por_caixa || 1);
                                  const step = item.qtd_por_caixa || 1;
                                  const next = Math.min(item.quantidade, current + step);
                                  setItemInputs(prev => ({ ...prev, [item.id]: next }));
                                }}
                                className="w-7 h-7 rounded flex items-center justify-center bg-white text-slate-500 shadow-sm hover:bg-slate-100 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                const qty = parseInt(itemInputs[item.id], 10) || (item.qtd_por_caixa || 1);
                                addToCart(item, qty);
                              }}
                              disabled={item.quantidade === 0}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 flex-1 disabled:opacity-50 disabled:pointer-events-none shadow-sm h-10"
                            >
                              <Plus className="w-4 h-4" />
                              Adicionar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="lg:w-80 shrink-0">
            <div className="site-card p-5 flex flex-col max-h-[250px] lg:max-h-[calc(100vh-200px)]">
              <div className="flex items-center justify-between mb-4 shrink-0">
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
                <div className="space-y-2 mb-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
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
                onClick={handleOpenModal}
                disabled={cart.length === 0 || loading}
                className="btn-magnetic w-full text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm tracking-widest uppercase disabled:opacity-40 transition-all hover:shadow-primary-glow shrink-0"
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
                {submitStatus === "error_operador" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-red-700 text-xs font-bold bg-red-50 px-4 py-2.5 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4" /> Preencha o campo "Operador Solicitante".
                  </motion.div>
                )}
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
                          {pedido.operadorSolicitante && (
                            <p className="text-[10px] font-bold text-orange-500 mt-0.5">Operador: {pedido.operadorSolicitante}</p>
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

      {/* ─── Modal do Operador Solicitante ───────────────────────────── */}
      <AnimatePresence>
        {showOperatorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowOperatorModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={SPRING}
              onClick={e => e.stopPropagation()}
              className="site-card w-full max-w-md p-8 relative overflow-hidden bg-white rounded-2xl shadow-2xl"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full mix-blend-multiply filter blur-3xl opacity-20" style={{ background: "var(--primary)" }} />

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-4">
                  <img
                    src="/funcionarioMARCONI.png"
                    alt="Funcionário Marconi"
                    className="w-24 h-24 object-contain shadow-sm"
                  />
                </div>

                <h2 className="text-xl font-display font-black text-slate-900 mb-2 text-center">Identificação do Operador</h2>
                <p className="text-sm text-slate-500 text-center mb-6">
                  Informe o nome ou matrícula do operador do chão de fábrica que solicitou esta peça.
                </p>

                <div className="w-full mb-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Operador Solicitante *</label>
                    <input
                      id="operadorSolicitante"
                      type="text"
                      required
                      placeholder="Ex: João Silva / Matrícula 123"
                      value={operadorSolicitante}
                      onChange={e => setOperadorSolicitante(e.target.value)}
                      className={`site-input w-full py-3 px-4 rounded-xl text-sm border-2 transition-all ${submitStatus === "error_operador" ? "border-red-500 ring-4 ring-red-50" : "border-slate-200 focus:border-[var(--primary)]"}`}
                      autoFocus
                    />
                    {submitStatus === "error_operador" && (
                      <p className="text-red-500 text-xs font-bold mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Este campo é obrigatório.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Ordem de Produção (OP) / Centro de Custo (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: OP-2023 / CC-405"
                      value={ordemProducao}
                      onChange={e => setOrdemProducao(e.target.value)}
                      className="site-input w-full py-3 px-4 rounded-xl text-sm border-2 border-slate-200 focus:border-[var(--primary)] transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button type="button" onClick={() => setShowOperatorModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border border-slate-200">
                    Cancelar
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleConfirmSubmit}
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-primary-glow"
                    style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                  >
                    {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" /> : <><Send className="w-4 h-4" /> Confirmar</>}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
