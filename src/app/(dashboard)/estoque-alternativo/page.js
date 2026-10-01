"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Boxes, Recycle, AlertCircle, Loader2 } from "lucide-react";

export default function EstoqueAlternativoPage() {
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

  const setores = ["TODOS", ...new Set(estoque.map((e) => e.setor))];

  const filtrados = estoque.filter((e) => {
    const matchesSearch = e.item?.nome.toLowerCase().includes(search.toLowerCase()) || e.item?.codigo.toLowerCase().includes(search.toLowerCase());
    const matchesSetor = filtroSetor === "TODOS" || e.setor === filtroSetor;
    return matchesSearch && matchesSetor;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col max-w-4xl mx-auto overflow-hidden px-4 md:px-0">
      <div className="pt-1 pb-4 shrink-0">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Recycle className="w-6 h-6 text-emerald-600" />
          Estoque Alternativo (Sobras)
        </h2>
        <p className="text-slate-500 text-xs mt-1 font-medium">
          Peças fracionadas e caixas abertas distribuídas por setor
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar peça por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-emerald-500 outline-none transition-colors"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto custom-scrollbar shrink-0">
          {setores.map((s) => (
            <button
              key={s}
              onClick={() => setFiltroSetor(s)}
              className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${
                filtroSetor === s
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
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
            filtrados.map((item) => (
              <motion.div
                key={`${item.itemId}-${item.setor}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-4 shadow-sm border-2 border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{item.item?.nome}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px]">
                      {item.item?.codigo}
                    </span>
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                      Setor: {item.setor}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 w-full sm:w-auto justify-between sm:justify-start">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Saldo Avulso
                  </span>
                  <span className="font-black text-lg text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">
                    {item.quantidade_avulsa} UN
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
