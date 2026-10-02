"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Boxes, Recycle, Loader2, MapPin, Package, Edit2, RefreshCcw } from "lucide-react";

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
        <Loader2 className="w-10 h-10 animate-spin text-[#1B3A6B]" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col max-w-5xl mx-auto overflow-hidden px-4 md:px-0">
      <div className="pt-2 pb-4 shrink-0">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Recycle className="w-6 h-6 text-[#1B3A6B]" />
          Estoque Alternativo (Sobras)
        </h2>
        <p className="text-slate-500 text-xs mt-1 font-medium">
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
            className="w-full bg-white border-2 border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-emerald-500 outline-none transition-colors"
          />
        </div>
        
        {/* Abas de Navegação */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setTab("itens")}
            className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              tab === "itens"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Package className="w-4 h-4" /> Itens em Estoque
          </button>
          <button
            onClick={() => setTab("requisicoes")}
            className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              tab === "requisicoes"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <RefreshCcw className="w-4 h-4" /> Requisições
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 custom-scrollbar space-y-3">
        {tab === "itens" ? (
          <AnimatePresence>
            {filtrados.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 flex flex-col items-center justify-center text-slate-300"
              >
                <Boxes className="w-12 h-12 mb-3 opacity-40" />
                <p className="font-bold text-sm text-slate-400">Nenhum estoque alternativo encontrado</p>
              </motion.div>
            ) : (
              filtrados.map((item) => {
                const semSobras = item.quantidade_avulsa === 0;
                return (
                <motion.div
                  key={`${item.itemId}-${item.setor}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-4"
                >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-base">{item.item?.nome}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded text-[10px]">
                        {item.item?.codigo}
                      </span>
                      <span className="bg-[#f0f4fb] border border-[#d0dbe9] text-[#1B3A6B] font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wider">
                        Setor: {item.setor}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end w-full sm:w-auto gap-2">
                    {semSobras ? (
                      <span className="bg-gray-100 text-gray-500 border border-gray-200 font-bold text-xs px-3 py-1.5 rounded-lg w-full sm:w-auto text-center whitespace-nowrap">
                        SEM SOBRAS
                      </span>
                    ) : (
                      <span className="bg-[#e8edf5] text-[#1B3A6B] border border-[#1B3A6B]/20 font-black text-sm px-4 py-1.5 rounded-lg w-full sm:w-auto text-center whitespace-nowrap shadow-sm">
                        {item.quantidade_avulsa} UN DISPONÍVEIS
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">Localização: [Box de Sobras - {item.setor} / {item.item?.localizacao || 'Sem Armário'}]</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <Package className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Caixa Padrão: [{item.item?.qtd_por_caixa || 1} {item.item?.unidade || 'UN'}]</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-[11px] font-bold transition-colors shadow-sm">
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Ajustar Saldo</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-[11px] font-bold transition-colors shadow-sm">
                      <RefreshCcw className="w-3.5 h-3.5" />
                      <span>Devolver p/ Central</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )})
          )}
          </AnimatePresence>
        ) : (
          <AnimatePresence>
            {pedidos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 flex flex-col items-center justify-center text-slate-300"
              >
                <Package className="w-12 h-12 mb-3 opacity-40" />
                <p className="font-bold text-sm text-slate-400">Nenhuma requisição pendente</p>
              </motion.div>
            ) : (
              pedidos.map((pedido) => (
                <motion.div
                  key={pedido.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-4"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-800 text-base">Pedido #{pedido.id.toString().padStart(4, "0")}</h3>
                    <span className="bg-amber-50 text-amber-600 font-bold px-2 py-1 rounded text-xs">Pendente</span>
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    <p>Solicitante: {pedido.operadorSolicitante || pedido.user?.nome}</p>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    {pedido.itens.filter(i => i.qtd_alternativo > 0).map(pi => (
                      <div key={pi.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 text-sm">{pi.item.nome}</span>
                          <span className="bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-mono">{pi.item.codigo}</span>
                        </div>
                        <span className="font-black text-emerald-600 text-sm">{pi.qtd_alternativo} {pi.item.unidade}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleSepararEntregar(pedido)}
                    className="w-full mt-2 bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                  >
                    <RefreshCcw className="w-4 h-4" /> Separar e Entregar
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
