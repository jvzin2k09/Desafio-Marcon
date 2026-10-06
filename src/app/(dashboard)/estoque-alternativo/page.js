"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Boxes, Recycle, Loader2, MapPin, Package, Edit2, RefreshCcw, Undo2 } from "lucide-react";

export default function EstoqueAlternativoPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("itens"); // "itens" | "requisicoes"
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    fetch("/api/estoque-alternativo")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setEstoque(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch("/api/pedidos")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          const ped = data.filter(p => 
            p.status !== "CONCLUIDO" && 
            p.status !== "ESTORNADO" && 
            p.itens.some(i => i.qtd_alternativo > 0)
          );
          setPedidos(ped);
        }
      })
      .catch(console.error);
  }, []);

  const filtrados = estoque.filter((e) => {
    return e.quantidade_avulsa > 0 && (e.item?.nome.toLowerCase().includes(search.toLowerCase()) || e.item?.codigo.toLowerCase().includes(search.toLowerCase()));
  });

  const [ajusteModal, setAjusteModal] = useState(null);
  const [novoSaldo, setNovoSaldo] = useState("");
  const [estornoModal, setEstornoModal] = useState(null);

  const executarEstorno = async (pedidoToEstornar) => {
    try {
      const res = await fetch("/api/estornos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: pedidoToEstornar.id, motivo: "Cancelado via Estoque Alternativo" })
      });
      if (res.ok) {
        setPedidos(prev => prev.filter(p => p.id !== pedidoToEstornar.id));
        fetch("/api/estoque-alternativo").then(r=>r.json()).then(setEstoque);
      }
    } catch (e) { console.error(e); }
  };

  const salvarAjuste = async () => {
    if (!ajusteModal || novoSaldo === "") return;
    const qtde = parseInt(novoSaldo, 10);
    if (isNaN(qtde) || qtde < 0) return;

    try {
      const res = await fetch("/api/estoque-alternativo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ajusteModal.id, novaQuantidade: qtde })
      });
      if (res.ok) {
        setEstoque(estoque.map(e => e.id === ajusteModal.id ? { ...e, quantidade_avulsa: qtde } : e));
        setAjusteModal(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSepararEntregar = async (pedido) => {
    try {
      const res = await fetch("/api/pedidos/separar-alternativo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: pedido.id }),
      });
      if (res.ok) {
        setPedidos(pedidos.filter(p => p.id !== pedido.id));
        // Refresh estoque
        fetch("/api/estoque-alternativo").then(r=>r.json()).then(setEstoque);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#1B3A6B] lg:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col w-full max-w-7xl mx-auto overflow-hidden px-4 lg:px-6">
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80">
        <h2 className="text-xl md:text-2xl font-display font-black text-slate-900 lg:text-white tracking-tight flex items-center gap-2">
          <Recycle className="w-6 h-6 text-[#1B3A6B] lg:text-blue-400" />
          Estoque Alternativo (Sobras)
        </h2>
        <p className="text-slate-500 lg:text-slate-400 text-xs mt-1 font-medium">
          Peças fracionadas e caixas abertas distribuídas por setor
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar peça por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 lg:bg-slate-900/80 lg:border-slate-700 lg:text-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-emerald-500 outline-none transition-colors lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200"
          />
        </div>
        
        {/* Abas de Navegação */}
        <div className="flex bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setTab("itens")}
            className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              tab === "itens"
                ? "bg-white text-slate-800 lg:bg-slate-700 lg:text-white shadow-sm"
                : "text-slate-500 lg:text-slate-400 hover:text-slate-700 lg:text-slate-300"
            }`}
          >
            <Package className="w-4 h-4" /> Itens em Estoque
          </button>
          <button
            onClick={() => setTab("requisicoes")}
            className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              tab === "requisicoes"
                ? "bg-white text-slate-800 lg:bg-slate-700 lg:text-white shadow-sm"
                : "text-slate-500 lg:text-slate-400 hover:text-slate-700 lg:text-slate-300"
            }`}
          >
            <RefreshCcw className="w-4 h-4" /> Requisições
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 custom-scrollbar">
        {tab === "itens" ? (
          <AnimatePresence>
            {filtrados.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 flex flex-col items-center justify-center text-slate-300 w-full"
              >
                <Boxes className="w-12 h-12 mb-3 opacity-40" />
                <p className="font-bold text-sm text-slate-400">Nenhum estoque alternativo encontrado</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-6">
              {filtrados.map((item) => {
                const semSobras = item.quantidade_avulsa === 0;
                return (
                <motion.div
                  key={`${item.itemId}-${item.setor}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-4 w-full"
                >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 lg:text-white text-base">{item.item?.nome}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 text-slate-600 lg:text-slate-300 font-bold px-2 py-1 rounded text-[10px]">
                        {item.item?.codigo}
                      </span>
                      <span className="bg-[#f0f4fb] lg:bg-blue-900/40 border border-[#d0dbe9] lg:border-blue-800/50 text-[#1B3A6B] lg:text-blue-400 font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wider">
                        Setor: {item.setor}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end w-full sm:w-auto gap-2">
                    {semSobras ? (
                      <span className="bg-gray-100 lg:bg-slate-800 text-gray-500 lg:text-slate-400 border border-gray-200 lg:border-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg w-full sm:w-auto text-center whitespace-nowrap">
                        SEM SOBRAS
                      </span>
                    ) : (
                      <span className="bg-[#e8edf5] lg:bg-blue-600 text-[#1B3A6B] lg:text-white border border-[#1B3A6B]/20 lg:border-transparent font-black text-sm px-4 py-1.5 rounded-lg w-full sm:w-auto text-center whitespace-nowrap shadow-sm">
                        {item.quantidade_avulsa} UN DISPONÍVEIS
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 p-3 rounded-xl border border-slate-100 mt-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600 lg:text-slate-300 font-medium">
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">Localização: [Box de Sobras - {item.setor} / {item.item?.localizacao || 'Sem Armário'}]</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 lg:text-slate-300 font-medium">
                    <Package className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Caixa Padrão: [{item.item?.qtd_por_caixa || 1} {item.item?.unidade || 'UN'}]</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                    <button 
                      onClick={() => {
                        setAjusteModal(item);
                        setNovoSaldo(item.quantidade_avulsa.toString());
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 lg:text-slate-300 hover:bg-slate-50 hover:lg:bg-slate-800/60 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 hover:text-slate-800 lg:text-white text-[11px] font-bold transition-colors shadow-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Ajustar Saldo</span>
                    </button>
                  </div>
                )}
              </motion.div>
              );
              })}
              </div>
          )}
          </AnimatePresence>
        ) : (
          <AnimatePresence>
            {pedidos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 flex flex-col items-center justify-center text-slate-300 w-full"
              >
                <Package className="w-12 h-12 mb-3 opacity-40" />
                <p className="font-bold text-sm text-slate-400">Nenhuma requisição pendente</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-6">
              {pedidos.map((pedido) => (
                <motion.div
                  key={pedido.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-200 flex flex-col gap-4 lg:gap-6 w-full"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-800 lg:text-white text-base">Pedido #{pedido.id.toString().padStart(4, "0")}</h3>
                    <span className="bg-amber-50 text-amber-600 font-bold px-2 py-1 rounded text-xs">Pendente</span>
                  </div>
                  <div className="text-sm font-medium text-slate-600 lg:text-slate-300">
                    <p>Solicitante: {pedido.operadorSolicitante || pedido.user?.nome}</p>
                  </div>
                  
                  <div className="space-y-2 mt-2 w-full">
                    {pedido.itens.filter(i => i.qtd_alternativo > 0).map(pi => (
                      <div key={pi.id} className="flex items-center justify-between gap-2 w-full p-3 bg-slate-50 lg:bg-slate-900/60 rounded-lg border border-slate-100 lg:border-slate-700 lg:text-slate-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-700 lg:text-slate-300 text-sm truncate">{pi.item.nome}</span>
                          <span className="shrink-0 bg-white lg:bg-slate-800 border border-slate-200 lg:border-slate-700 text-slate-500 lg:text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-mono">{pi.item.codigo}</span>
                        </div>
                        <span className="shrink-0 font-black text-emerald-600 text-sm text-right">{pi.qtd_alternativo} {pi.item.unidade}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 w-full mt-2 lg:mt-4 pt-4 lg:pt-5 border-t border-slate-100 lg:border-slate-800/60">
                    <button 
                      onClick={() => handleSepararEntregar(pedido)}
                      className="flex-1 bg-indigo-600 text-white font-bold py-3 lg:py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20 lg:text-xs uppercase tracking-wide"
                    >
                      <RefreshCcw className="w-4 h-4" /> Separar e Entregar
                    </button>
                    <button 
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                          setEstornoModal(pedido);
                        } else {
                          if(!confirm("Deseja cancelar e estornar esta requisição?")) return;
                          executarEstorno(pedido);
                        }
                      }}
                      className="flex-1 bg-white lg:bg-slate-800 text-red-600 border border-slate-200 lg:border-slate-700 font-bold py-3 lg:py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 hover:lg:bg-red-900/40 transition-all active:scale-[0.98] lg:text-xs uppercase tracking-wide"
                    >
                      <Undo2 className="w-4 h-4" /> Cancelar / Estornar
                    </button>
                  </div>
                </motion.div>
              ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Modal Ajustar Saldo */}
      <AnimatePresence>
        {ajusteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAjusteModal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              className="site-card w-full max-w-sm p-6 relative overflow-hidden bg-white lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 rounded-2xl shadow-2xl flex flex-col"
            >
              <h2 className="text-lg font-bold text-slate-900 lg:text-white mb-1">Ajustar Saldo</h2>
              <p className="text-xs text-slate-500 lg:text-slate-400 mb-4">{ajusteModal.item?.nome}</p>
              
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Nova Quantidade</label>
              <input 
                type="number" 
                value={novoSaldo} 
                onChange={e => setNovoSaldo(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-[#1B3A6B] outline-none"
                autoFocus
              />
              
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setAjusteModal(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 lg:text-slate-300 bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 hover:bg-slate-200 hover:lg:bg-slate-800/60 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={salvarAjuste}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3A6B] hover:bg-[#1B3A6B]/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Estorno (Apenas Desktop) */}
      <AnimatePresence>
        {estornoModal && (
          <div className="fixed inset-0 z-[70] hidden lg:flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEstornoModal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col"
            >
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                ⚠️ Confirmar Estorno
              </h2>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Tem a certeza de que deseja cancelar e estornar esta requisição? O saldo voltará para o estoque.
              </p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setEstornoModal(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={() => {
                    executarEstorno(estornoModal);
                    setEstornoModal(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  Confirmar Estorno
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
