"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Boxes, Recycle, Loader2, MapPin, Package } from "lucide-react";

export default function EstoqueAlternativoPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("TODOS");

  useEffect(() => {
    fetch("/api/estoque-alternativo")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setEstoque(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const setores = ["TODOS", "Usinagem", "Mecânica", "Movimento", "Hidráulica", "Prátika", "Geral"];

  const filtrados = estoque.filter((e) => {
    const matchesSearch = e.item?.nome.toLowerCase().includes(search.toLowerCase()) || e.item?.codigo.toLowerCase().includes(search.toLowerCase());
    const matchesSetor = filtroSetor === "TODOS" || e.setor === filtroSetor;
    return matchesSearch && matchesSetor;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col max-w-5xl mx-auto overflow-hidden px-4 md:px-0">
      <div className="pt-2 pb-4 shrink-0">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Recycle className="w-6 h-6 text-emerald-600" />
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
        
        {/* Carrossel de Setores */}
        <div className="flex bg-transparent rounded-xl overflow-x-auto no-scrollbar gap-2 shrink-0 pb-1">
          {setores.map((s) => (
            <button
              key={s}
              onClick={() => setFiltroSetor(s)}
              className={`px-4 py-2 text-[11px] font-bold rounded-full transition-all whitespace-nowrap border-2 ${
                filtroSetor === s
                  ? "bg-slate-800 text-white border-slate-800 shadow-md"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 custom-scrollbar space-y-3">
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
                      <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wider">
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
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-sm px-4 py-1.5 rounded-lg w-full sm:w-auto text-center whitespace-nowrap shadow-sm">
                        {item.quantidade_avulsa} UN DISPONÍVEIS
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">📍 Localização: [Box de Sobras - {item.setor} / {item.item?.localizacao || 'Sem Armário'}]</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <Package className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>📦 Caixa Padrão: [{item.item?.qtd_por_caixa || 1} {item.item?.unidade || 'UN'}]</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-[11px] font-bold transition-colors shadow-sm">
                      <span>✏️ Ajustar Saldo</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-[11px] font-bold transition-colors shadow-sm">
                      <span>🔄 Devolver p/ Central</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )})
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
