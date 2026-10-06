"use client";

import { useState, useEffect, memo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Boxes,
  Recycle,
  Loader2,
  MapPin,
  Package,
  Edit2,
  RefreshCcw,
  Undo2,
  Clock,
  CheckCircle2,
} from "lucide-react";

// ─── Helpers de Tempo e Urgência ─────────────────────────────────────────────
function getTempoEspera(createdAt) {
  if (!createdAt) return "Recente";
  const diff = Math.floor((new Date() - new Date(createdAt)) / 60000);
  if (diff < 1) return "Agora";
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
}

function getUrgencia(createdAt) {
  if (!createdAt) {
    return {
      border: "border-slate-200 lg:border-slate-800",
      badgeText: "Recente",
      badgeClass:
        "bg-slate-100 text-slate-600 border border-slate-200 lg:bg-slate-800 lg:text-slate-300 lg:border-slate-700/60 font-medium",
    };
  }
  const diffMin = Math.floor((new Date() - new Date(createdAt)) / 60000);
  const tempo = getTempoEspera(createdAt);

  if (diffMin >= 45) {
    return {
      border: "border-rose-300 lg:border-rose-500 lg:shadow-lg lg:shadow-rose-950/25",
      badgeText: `🚨 Urgente (${tempo})`,
      badgeClass:
        "bg-rose-50 text-rose-700 border border-rose-200 lg:bg-rose-500/15 lg:border-rose-500/30 lg:text-rose-400 font-bold",
    };
  }
  if (diffMin >= 15) {
    return {
      border: "border-amber-300 lg:border-amber-500/50 lg:bg-amber-950/10",
      badgeText: `⚠️ Atenção (${tempo})`,
      badgeClass:
        "bg-amber-50 text-amber-700 border border-amber-200 lg:bg-amber-500/15 lg:border-amber-500/30 lg:text-amber-400 font-bold",
    };
  }
  return {
    border: "border-slate-200 lg:border-slate-800",
    badgeText: tempo,
    badgeClass:
      "bg-slate-100 text-slate-600 border border-slate-200 lg:bg-slate-800 lg:text-slate-300 lg:border-slate-700/60 font-medium",
  };
}

// ─── Card de Requisição (Adaptado Desktop e Mobile) ──────────────────────────
const RequisicaoCard = memo(function RequisicaoCard({
  pedido,
  onSeparar,
  onEstornar,
  isProcessing,
}) {
  const urgencia = getUrgencia(pedido.createdAt);
  const solicitante =
    pedido.operadorSolicitante || pedido.user?.nome || "Não informado";
  const setor = pedido.setor || "Geral";
  const itensAlternativo =
    pedido.itens?.filter((i) => i.qtd_alternativo > 0) || [];
  const totalItens = itensAlternativo.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white lg:bg-slate-900/80 lg:backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-sm lg:shadow-xl border-2 transition-all flex flex-col justify-between w-full ${urgencia.border}`}
    >
      <div>
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-black text-slate-900 lg:text-white text-base sm:text-lg tracking-tight">
              #{pedido.id.toString().padStart(4, "0")}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 lg:bg-slate-800/80 lg:border lg:border-slate-700/60 lg:text-slate-300 text-[10px] font-bold uppercase tracking-wide truncate max-w-[120px]">
              {setor}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] flex items-center gap-1 ${urgencia.badgeClass}`}
            >
              <Clock className="w-3 h-3" />
              {urgencia.badgeText}
            </span>
          </div>
        </div>

        {/* Solicitante */}
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 lg:border-slate-800/60">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Solicitante
            </span>
            <p className="text-sm font-semibold text-slate-800 lg:text-slate-100 truncate">
              {solicitante}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 shrink-0 bg-slate-50 lg:bg-slate-800/60 px-2 py-1 rounded-md border border-slate-100 lg:border-slate-700/50">
            {totalItens} {totalItens === 1 ? "Item" : "Itens"}
          </span>
        </div>

        {/* Lista de Itens Solicitados (Sobras) */}
        <div className="space-y-2 mb-2">
          {itensAlternativo.map((pi) => (
            <div
              key={pi.id}
              className="p-2.5 rounded-xl bg-slate-50/80 lg:bg-slate-950/40 border border-slate-100 lg:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 lg:text-slate-200 truncate">
                    {pi.item?.nome}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="bg-white lg:bg-slate-800 border border-slate-200 lg:border-slate-700/60 text-slate-500 lg:text-slate-400 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                      {pi.item?.codigo}
                    </span>
                    {pi.item?.localizacao && (
                      <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                        · Box: {pi.item.localizacao}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantidade Destaque */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase sm:hidden">
                  Qtd Sobras:
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-emerald-700 lg:text-emerald-400 bg-emerald-50 lg:bg-emerald-950/50 border border-emerald-200/80 lg:border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  {pi.qtd_alternativo} {pi.item?.unidade || "UN"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé / Ações: Perfeitamente adaptado para Mobile e Desktop */}
      <div className="mt-4 pt-3 border-t border-slate-100 lg:border-slate-800/60">
        {/* Versão Desktop (lg:): Botões 100% contidos dentro do card com largura total */}
        <div className="hidden lg:flex flex-col gap-2 w-full">
          <button
            onClick={() => onSeparar(pedido)}
            disabled={isProcessing}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
                <span>Separar e Entregar</span>
              </>
            )}
          </button>

          <button
            onClick={() => onEstornar(pedido)}
            disabled={isProcessing}
            title="Cancelar / Estornar requisição"
            className="w-full h-9 bg-slate-800/80 hover:bg-rose-950/30 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Estornar Requisição</span>
          </button>
        </div>

        {/* Versão Mobile (< lg): Botão principal de destaque total + Ação secundária em linha separada */}
        <div className="flex flex-col gap-2 lg:hidden">
          <button
            onClick={() => onSeparar(pedido)}
            disabled={isProcessing}
            className="w-full py-3 bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Separar e Entregar
              </>
            )}
          </button>

          <button
            onClick={() => onEstornar(pedido)}
            disabled={isProcessing}
            className="w-full py-2.5 bg-slate-50 hover:bg-rose-50 active:bg-rose-100 text-slate-500 hover:text-rose-600 border border-slate-200/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Undo2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
            <span>Cancelar / Estornar requisição</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Página Principal de Estoque Alternativo ───────────────────────────────────
export default function EstoqueAlternativoPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("itens"); // "itens" | "requisicoes"
  const [pedidos, setPedidos] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [estornandoId, setEstornandoId] = useState(null);

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
          const ped = data.filter(
            (p) =>
              p.status !== "CONCLUIDO" &&
              p.status !== "ESTORNADO" &&
              p.itens?.some((i) => i.qtd_alternativo > 0)
          );
          setPedidos(ped);
        }
      })
      .catch(console.error);
  }, []);

  // Filtro de itens de estoque
  const filtrados = estoque.filter((e) => {
    return (
      e.quantidade_avulsa > 0 &&
      (e.item?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        e.item?.codigo?.toLowerCase().includes(search.toLowerCase()))
    );
  });

  // Filtro e ordenação FIFO de requisições pendentes
  const pedidosFiltrados = pedidos
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const idFormatted = `#${p.id.toString().padStart(4, "0")}`.toLowerCase();
      const idPlain = p.id.toString();
      const solicitante = (
        p.operadorSolicitante ||
        p.user?.nome ||
        ""
      ).toLowerCase();
      const setor = (p.setor || "").toLowerCase();
      const hasItem = p.itens?.some(
        (pi) =>
          pi.qtd_alternativo > 0 &&
          (pi.item?.nome?.toLowerCase().includes(q) ||
            pi.item?.codigo?.toLowerCase().includes(q))
      );
      return (
        idFormatted.includes(q) ||
        idPlain.includes(q) ||
        solicitante.includes(q) ||
        setor.includes(q) ||
        hasItem
      );
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const [ajusteModal, setAjusteModal] = useState(null);
  const [novoSaldo, setNovoSaldo] = useState("");
  const [estornoModal, setEstornoModal] = useState(null);

  const executarEstorno = async (pedidoToEstornar) => {
    setEstornandoId(pedidoToEstornar.id);
    try {
      const res = await fetch("/api/estornos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: pedidoToEstornar.id,
          motivo: "Cancelado via Estoque Alternativo",
        }),
      });
      if (res.ok) {
        setPedidos((prev) => prev.filter((p) => p.id !== pedidoToEstornar.id));
        fetch("/api/estoque-alternativo").then((r) => r.json()).then(setEstoque);
      } else {
        const d = await res.json();
        alert(d.error || "Erro ao estornar.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao estornar.");
    } finally {
      setEstornandoId(null);
      setEstornoModal(null);
    }
  };

  const salvarAjuste = async () => {
    if (!ajusteModal || novoSaldo === "") return;
    const qtde = parseInt(novoSaldo, 10);
    if (isNaN(qtde) || qtde < 0) return;

    try {
      const res = await fetch("/api/estoque-alternativo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ajusteModal.id, novaQuantidade: qtde }),
      });
      if (res.ok) {
        setEstoque(
          estoque.map((e) =>
            e.id === ajusteModal.id ? { ...e, quantidade_avulsa: qtde } : e
          )
        );
        setAjusteModal(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSepararEntregar = async (pedido) => {
    setProcessingId(pedido.id);
    try {
      const res = await fetch("/api/pedidos/separar-alternativo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: pedido.id }),
      });
      if (res.ok) {
        setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
        // Atualiza estoque de sobras
        fetch("/api/estoque-alternativo").then((r) => r.json()).then(setEstoque);
      } else {
        const d = await res.json();
        alert(d.error || "Erro ao separar pedido.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao processar separação.");
    } finally {
      setProcessingId(null);
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
      {/* Cabeçalho da Página */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80">
        <h2 className="text-xl md:text-2xl font-display font-black text-slate-900 lg:text-white tracking-tight flex items-center gap-2">
          <Recycle className="w-6 h-6 text-[#1B3A6B] lg:text-blue-400" />
          Estoque Alternativo (Sobras)
        </h2>
        <p className="text-slate-500 lg:text-slate-400 text-xs mt-1 font-medium">
          Peças fracionadas e caixas abertas distribuídas por setor
        </p>
      </div>

      {/* Toolbar: Busca + Abas com contadores */}
      <div className="flex flex-col sm:flex-row gap-3 my-4 shrink-0 justify-between items-stretch sm:items-center">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              tab === "itens"
                ? "Buscar peça por nome ou código..."
                : "Buscar por pedido, solicitante ou peça..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 lg:bg-slate-900/80 lg:border-slate-700/80 lg:text-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-emerald-500 outline-none transition-colors lg:backdrop-blur-md shadow-sm"
          />
        </div>

        {/* Abas de Navegação */}
        <div className="flex bg-slate-100 lg:bg-slate-800/70 lg:border lg:border-slate-700/60 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setTab("itens")}
            className={`flex-1 sm:flex-none px-4 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === "itens"
                ? "bg-white text-slate-800 lg:bg-slate-700 lg:text-white shadow-sm"
                : "text-slate-500 lg:text-slate-400 hover:text-slate-700 lg:text-slate-200"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Itens em Estoque</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 lg:bg-slate-800 text-slate-600 lg:text-slate-300 ml-1">
              {filtrados.length}
            </span>
          </button>
          <button
            onClick={() => setTab("requisicoes")}
            className={`flex-1 sm:flex-none px-4 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === "requisicoes"
                ? "bg-white text-slate-800 lg:bg-slate-700 lg:text-white shadow-sm"
                : "text-slate-500 lg:text-slate-400 hover:text-slate-700 lg:text-slate-200"
            }`}
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Requisições</span>
            {pedidos.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white ml-1 animate-pulse">
                {pedidos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
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
                <p className="font-bold text-sm text-slate-400">
                  Nenhum estoque alternativo encontrado
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
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
                          <h3 className="font-bold text-slate-800 lg:text-white text-base">
                            {item.item?.nome}
                          </h3>
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
                          <span className="truncate">
                            Localização: [Box de Sobras - {item.setor} /{" "}
                            {item.item?.localizacao || "Sem Armário"}]
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 lg:text-slate-300 font-medium">
                          <Package className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>
                            Caixa Padrão: [{item.item?.qtd_por_caixa || 1}{" "}
                            {item.item?.unidade || "UN"}]
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                          <button
                            onClick={() => {
                              setAjusteModal(item);
                              setNovoSaldo(item.quantidade_avulsa.toString());
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 lg:text-slate-300 hover:bg-slate-50 hover:lg:bg-slate-800/60 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 hover:text-slate-800 lg:text-white text-[11px] font-bold transition-colors shadow-sm cursor-pointer"
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
            {pedidosFiltrados.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 flex flex-col items-center justify-center text-slate-300 w-full"
              >
                <Package className="w-12 h-12 mb-3 opacity-40 text-slate-400" />
                <p className="font-bold text-sm text-slate-500 lg:text-slate-400">
                  {search
                    ? "Nenhuma requisição encontrada para esta busca"
                    : "Nenhuma requisição pendente no momento"}
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                {pedidosFiltrados.map((pedido) => (
                  <RequisicaoCard
                    key={pedido.id}
                    pedido={pedido}
                    onSeparar={handleSepararEntregar}
                    onEstornar={(p) => setEstornoModal(p)}
                    isProcessing={processingId === pedido.id}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Modal Ajustar Saldo */}
      <AnimatePresence>
        {ajusteModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setAjusteModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="site-card w-full max-w-sm p-6 relative overflow-hidden bg-white lg:bg-slate-900/95 lg:border lg:border-slate-800 rounded-2xl shadow-2xl flex flex-col"
            >
              <h2 className="text-lg font-bold text-slate-900 lg:text-white mb-1">
                Ajustar Saldo
              </h2>
              <p className="text-xs text-slate-500 lg:text-slate-400 mb-4">
                {ajusteModal.item?.nome}
              </p>

              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                Nova Quantidade
              </label>
              <input
                type="number"
                value={novoSaldo}
                onChange={(e) => setNovoSaldo(e.target.value)}
                className="w-full border-2 border-slate-200 lg:border-slate-700 lg:bg-slate-800 lg:text-white rounded-xl px-3 py-2 text-sm font-bold focus:border-emerald-500 outline-none"
                autoFocus
              />

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setAjusteModal(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 lg:text-slate-300 bg-slate-100 lg:bg-slate-800 hover:bg-slate-200 hover:lg:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarAjuste}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Estorno (Adaptado para Desktop e Mobile) */}
      <AnimatePresence>
        {estornoModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !estornandoId && setEstornoModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white lg:bg-slate-900/95 border border-slate-200 lg:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 lg:bg-red-950/40 flex items-center justify-center shrink-0 border border-red-100 lg:border-red-900/30">
                  <Undo2 className="w-5 h-5 text-red-600 lg:text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 lg:text-white">
                    Confirmar Estorno
                  </h2>
                  <p className="text-xs font-mono text-slate-400">
                    Pedido #{estornoModal.id.toString().padStart(4, "0")} ·{" "}
                    {estornoModal.operadorSolicitante || estornoModal.user?.nome}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 lg:text-slate-300 mb-5 leading-relaxed bg-slate-50 lg:bg-slate-950/40 p-3 rounded-xl border border-slate-100 lg:border-slate-800">
                Tem certeza de que deseja cancelar e estornar esta requisição? O pedido será estornado e o saldo voltará para o estoque alternativo.
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setEstornoModal(null)}
                  disabled={estornandoId === estornoModal.id}
                  className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 lg:text-slate-300 bg-slate-100 lg:bg-slate-800/80 hover:bg-slate-200 hover:lg:bg-slate-700 border border-slate-200 lg:border-slate-700/60 transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={() => executarEstorno(estornoModal)}
                  disabled={estornandoId === estornoModal.id}
                  className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {estornandoId === estornoModal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Undo2 className="w-4 h-4" />
                      Confirmar Estorno
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
