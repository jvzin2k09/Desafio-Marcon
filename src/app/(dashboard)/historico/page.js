"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  History, 
  FileSpreadsheet, 
  Search, 
  Calendar, 
  Filter, 
  Undo2, 
  PackageCheck, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  Layers, 
  AlertCircle, 
  RefreshCw,
  X,
  MapPin,
  Clock,
  User as UserIcon,
  Tag,
  ScrollText
} from "lucide-react";

export default function HistoricoPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("TODOS"); // 'TODOS' | 'SAIDA' | 'ESTORNO' | 'ENTRADA'
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Expansão de detalhes
  const [expandedId, setExpandedId] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Feedback de exportação
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Carrega histórico da API
  const carregarHistorico = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/historico");
      if (!res.ok) throw new Error("Erro ao buscar dados do histórico");
      const data = await res.json();
      setMovimentacoes(data);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o histórico. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  // Atalhos rápidos de data
  const aplicarAtalhoData = (dias) => {
    const hoje = new Date();
    const dataFimStr = hoje.toISOString().split("T")[0];

    if (dias === "hoje") {
      setDataInicio(dataFimStr);
      setDataFim(dataFimStr);
    } else if (dias === "mes") {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      setDataInicio(primeiroDia.toISOString().split("T")[0]);
      setDataFim(dataFimStr);
    } else if (typeof dias === "number") {
      const inicio = new Date();
      inicio.setDate(hoje.getDate() - dias);
      setDataInicio(inicio.toISOString().split("T")[0]);
      setDataFim(dataFimStr);
    } else if (dias === "limpar") {
      setDataInicio("");
      setDataFim("");
    }
    setCurrentPage(1);
  };

  // Filtragem dos dados no cliente
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter((m) => {
      // 1. Tipo
      if (tipoFiltro !== "TODOS" && m.tipo !== tipoFiltro) return false;

      // 2. Data
      if (dataInicio) {
        const dMov = new Date(m.data);
        const dIni = new Date(`${dataInicio}T00:00:00`);
        if (dMov < dIni) return false;
      }
      if (dataFim) {
        const dMov = new Date(m.data);
        const dFim = new Date(`${dataFim}T23:59:59`);
        if (dMov > dFim) return false;
      }

      // 3. Busca textual
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = m.id.toString().includes(q);
        const matchNome = m.solicitante?.nome?.toLowerCase().includes(q);
        const matchSetor = m.solicitante?.setor?.toLowerCase().includes(q);
        const matchMotivo = m.motivo && m.motivo.toLowerCase().includes(q);
        const matchItens = m.itens?.some(
          (i) => i.nome.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q)
        );
        return matchId || matchNome || matchSetor || matchMotivo || matchItens;
      }

      return true;
    });
  }, [movimentacoes, tipoFiltro, dataInicio, dataFim, search]);

  // Cálculos de KPIs baseados no resultado filtrado
  const kpis = useMemo(() => {
    let saidas = 0;
    let estornos = 0;
    let totalPecas = 0;

    movimentacoesFiltradas.forEach((m) => {
      if (m.tipo === "ESTORNO") estornos++;
      else saidas++;
      totalPecas += m.totalQuantidade || 0;
    });

    return {
      total: movimentacoesFiltradas.length,
      saidas,
      estornos,
      totalPecas
    };
  }, [movimentacoesFiltradas]);

  // Paginação
  const totalPages = Math.ceil(movimentacoesFiltradas.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return movimentacoesFiltradas.slice(start, start + itemsPerPage);
  }, [movimentacoesFiltradas, currentPage]);

  // ─── Exportação para Excel (CSV compatível nativo) ───────────────────────────
  const exportarParaExcel = () => {
    if (movimentacoesFiltradas.length === 0) {
      alert("Nenhum dado encontrado para exportação com os filtros atuais.");
      return;
    }

    setExporting(true);

    try {
      // Cabeçalhos para o Excel
      const headers = [
        "ID Pedido",
        "Data e Hora",
        "Tipo Movimentacao",
        "Status",
        "Responsável / Solicitante",
        "Email Solicitante",
        "Setor",
        "Codigo da Peca (SKU)",
        "Descricao da Peca",
        "Quantidade Solicitada",
        "Quantidade Movimentada",
        "Unidade",
        "Localizacao no Estoque",
        "Responsavel Almoxarife",
        "Motivo / Observacoes"
      ];

      const rows = [];

      movimentacoesFiltradas.forEach((m) => {
        const dataFormatada = new Date(m.data).toLocaleString("pt-BR");
        const tipoLabel = m.tipo === "ESTORNO" ? "ESTORNO (DEVOLUÇÃO)" : "SAÍDA (ENTREGA)";
        const statusLabel = m.status;
        const solicitanteNome = m.solicitante?.nome || "Não informado";
        const email = m.solicitante?.email || "";
        const setor = m.solicitante?.setor || "Geral";
        const responsavel = m.responsavel || "Almoxarifado";
        const motivo = (m.motivo || m.observacao || "").replace(/"/g, '""');

        // Cria uma linha para cada SKU do pedido
        m.itens.forEach((item) => {
          rows.push([
            `#${m.id.toString().padStart(4, "0")}`,
            `"${dataFormatada}"`,
            `"${tipoLabel}"`,
            `"${statusLabel}"`,
            `"${solicitanteNome}"`,
            `"${email}"`,
            `"${setor}"`,
            `"${item.codigo}"`,
            `"${item.nome.replace(/"/g, '""')}"`,
            item.quantidadeSolicitada,
            item.quantidadeEfetiva,
            `"${item.unidade}"`,
            `"${item.localizacao}"`,
            `"${responsavel}"`,
            `"${motivo}"`
          ]);
        });
      });

      // UTF-8 com BOM (\uFEFF) e delimitador ';' para o Excel abrir em colunas direto no Brasil
      const csvContent =
        "\uFEFF" +
        [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const hojeStr = new Date().toISOString().split("T")[0];
      const sufixoData = dataInicio || dataFim ? `_${dataInicio || "inicio"}_a_${dataFim || "fim"}` : `_${hojeStr}`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", `historico_movimentacoes_marcon${sufixoData}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (e) {
      console.error("Erro na exportação:", e);
      alert("Erro ao gerar o arquivo Excel.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar flex flex-col space-y-4 md:space-y-6 max-w-7xl mx-auto pb-4 p-4 md:p-6">
      {/* ─── Topo: Título e Ação de Exportar ─────────────────────────────── */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80">
        <div className="flex flex-row items-center justify-between gap-2 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl sm:text-3xl font-display font-black text-slate-900 lg:text-white tracking-tight leading-tight">
              Histórico de <span className="text-[#1B3A6B] lg:text-blue-400">Movimentações</span>
            </h1>
            <p className="text-slate-500 lg:text-slate-400 text-[11px] md:text-sm mt-0.5 font-medium">
              Suas movimentações passadas
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={carregarHistorico}
              disabled={loading}
              className="p-2.5 md:p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 lg:bg-slate-800/60 lg:border-slate-700 hover:lg:bg-slate-700 text-slate-600 lg:text-slate-300 transition-all shadow-sm disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 md:w-4 md:h-4 ${loading ? "animate-spin text-[#1B3A6B] lg:text-blue-400" : ""}`} />
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportarParaExcel}
              disabled={loading || movimentacoesFiltradas.length === 0 || exporting}
              className="flex items-center justify-center p-2.5 md:px-5 md:py-3 rounded-xl md:rounded-xl text-white font-bold text-sm tracking-wide shadow-md transition-all disabled:opacity-50 cursor-pointer bg-emerald-600"
              style={{ background: "linear-gradient(135deg, #107C41 0%, #0d6334 100%)" }}
              title="Exportar Planilha"
            >
              <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 text-white" />
              <span className="hidden md:inline ml-2">{exporting ? "Gerando..." : "Exportar Excel"}</span>
              <span className="ml-1.5 md:ml-2 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs rounded-full bg-white/20 font-mono flex items-center justify-center">
                {movimentacoesFiltradas.length}
              </span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Alerta de sucesso na exportação */}
      <AnimatePresence>
        {exportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between shadow-sm shrink-0"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Planilha gerada com sucesso! O download foi iniciado automaticamente.</span>
            </div>
            <button onClick={() => setExportSuccess(false)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Cards de Métricas (KPIs) ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div className="p-3 md:p-5 rounded-2xl bg-[var(--primary)] text-white shadow-md border border-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-white opacity-5 rounded-full -mr-8 -mt-8 md:-mr-12 md:-mt-12 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200" />
          <div className="flex justify-between items-center text-slate-300 mb-1 md:mb-2 relative z-10">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider truncate">Movimentações</span>
            <Layers className="w-4 h-4 text-slate-300 shrink-0" />
          </div>
          <div className="text-xl md:text-2xl font-mono font-black text-white relative z-10">{kpis.total}</div>
          <span className="text-[9px] md:text-[11px] text-slate-300 font-medium relative z-10 truncate block">No período</span>
        </div>

        <div className="p-3 md:p-5 rounded-2xl bg-[var(--primary)] text-white shadow-md border border-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-white opacity-5 rounded-full -mr-8 -mt-8 md:-mr-12 md:-mt-12 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200" />
          <div className="flex justify-between items-center text-slate-300 mb-1 md:mb-2 relative z-10">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider truncate">Entregas</span>
            <PackageCheck className="w-4 h-4 text-slate-300 shrink-0" />
          </div>
          <div className="text-xl md:text-2xl font-mono font-black text-white relative z-10">{kpis.saidas}</div>
          <span className="text-[9px] md:text-[11px] text-slate-300 font-medium relative z-10 truncate block">Concluídos</span>
        </div>

        <div className="p-3 md:p-5 rounded-2xl bg-[var(--primary)] text-white shadow-md border border-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-white opacity-5 rounded-full -mr-8 -mt-8 md:-mr-12 md:-mt-12 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200" />
          <div className="flex justify-between items-center text-slate-300 mb-1 md:mb-2 relative z-10">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider truncate">Estornos</span>
            <Undo2 className="w-4 h-4 text-slate-300 shrink-0" />
          </div>
          <div className="text-xl md:text-2xl font-mono font-black text-white relative z-10">{kpis.estornos}</div>
          <span className="text-[9px] md:text-[11px] text-slate-300 font-medium relative z-10 truncate block">Devoluções</span>
        </div>

        <div className="p-3 md:p-5 rounded-2xl bg-[var(--primary)] text-white shadow-md border border-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-white opacity-5 rounded-full -mr-8 -mt-8 md:-mr-12 md:-mt-12 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200" />
          <div className="flex justify-between items-center text-slate-300 mb-1 md:mb-2 relative z-10">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider truncate">Volume (Qtd)</span>
            <Tag className="w-4 h-4 text-slate-300 shrink-0" />
          </div>
          <div className="text-xl md:text-2xl font-mono font-black text-white relative z-10">{kpis.totalPecas}</div>
          <span className="text-[9px] md:text-[11px] text-slate-300 font-medium relative z-10 truncate block">Peças movidas</span>
        </div>
      </div>

      {/* ─── Barra de Filtros e Busca ─────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm lg:bg-slate-900/80 lg:backdrop-blur-md lg:border-slate-800/80 lg:shadow-xl space-y-4 shrink-0 lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          {/* Abas de Tipo */}
          <div className="flex overflow-x-auto gap-1.5 p-1 rounded-xl bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 self-start shrink-0 custom-scrollbar max-w-full">
            <button
              onClick={() => { setTipoFiltro("TODOS"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                tipoFiltro === "TODOS"
                  ? "bg-white lg:bg-slate-700 text-slate-900 lg:text-white shadow-sm"
                  : "text-slate-600 lg:text-slate-300 hover:text-slate-900 lg:text-white hover:bg-white/50 hover:lg:bg-slate-700/50"
              }`}
            >
              Todas ({movimentacoes.length})
            </button>
            <button
              onClick={() => { setTipoFiltro("SAIDA"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                tipoFiltro === "SAIDA"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-700 hover:bg-emerald-50 hover:lg:bg-emerald-900/40"
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Saídas
            </button>
            <button
              onClick={() => { setTipoFiltro("ENTRADA"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                tipoFiltro === "ENTRADA"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-700 hover:bg-blue-50 hover:lg:bg-blue-900/40"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Entradas
            </button>
            <button
              onClick={() => { setTipoFiltro("ESTORNO"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                tipoFiltro === "ESTORNO"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-red-700 hover:bg-red-50 hover:lg:bg-red-900/40"
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
              Estornos
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por # pedido, item, responsável ou setor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs font-medium text-slate-800 lg:text-white placeholder-slate-400 focus:outline-none focus:border-[#1B3A6B] focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 lg:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Filtro por Período de Data ── */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 lg:text-slate-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-[#1B3A6B] lg:text-blue-400" /> Filtrar Data
              </span>
              {(dataInicio || dataFim) && (
                <button
                  onClick={() => aplicarAtalhoData("limpar")}
                  className="md:hidden text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-1.5">
              <div className="flex items-center gap-1.5 bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 border border-slate-200 rounded-lg px-2 py-1.5 w-full">
                <span className="text-slate-400 text-[10px] font-bold">DE</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => { setDataInicio(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-[11px] sm:text-xs font-mono font-medium text-slate-700 lg:text-slate-300 outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 border border-slate-200 rounded-lg px-2 py-1.5 w-full">
                <span className="text-slate-400 text-[10px] font-bold">ATÉ</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => { setDataFim(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-[11px] sm:text-xs font-mono font-medium text-slate-700 lg:text-slate-300 outline-none w-full"
                />
              </div>
            </div>

            {(dataInicio || dataFim) && (
              <button
                onClick={() => aplicarAtalhoData("limpar")}
                className="hidden md:block text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-1"
                title="Limpar filtro de data"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Atalhos Rápidos */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 text-slate-500 lg:text-slate-400">
            <button
              onClick={() => aplicarAtalhoData("hoje")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 hover:bg-slate-200 hover:lg:bg-slate-800/60 text-slate-700 lg:text-slate-300 font-semibold transition-colors text-[11px] whitespace-nowrap"
            >
              Hoje
            </button>
            <button
              onClick={() => aplicarAtalhoData(7)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 hover:bg-slate-200 hover:lg:bg-slate-800/60 text-slate-700 lg:text-slate-300 font-semibold transition-colors text-[11px] whitespace-nowrap"
            >
              7 dias
            </button>
            <button
              onClick={() => aplicarAtalhoData(30)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 hover:bg-slate-200 hover:lg:bg-slate-800/60 text-slate-700 lg:text-slate-300 font-semibold transition-colors text-[11px] whitespace-nowrap"
            >
              30 dias
            </button>
            <button
              onClick={() => aplicarAtalhoData("mes")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 hover:bg-slate-200 hover:lg:bg-slate-800/60 text-slate-700 lg:text-slate-300 font-semibold transition-colors text-[11px] whitespace-nowrap"
            >
              Este Mês
            </button>
          </div>
        </div>
      </div>

      {/* ─── Tabela de Movimentações / Lista de Cards ─────────────────────────────────────── */}
      <div className="bg-white lg:bg-[#111827]/80 border border-slate-200 lg:border-slate-800/80 rounded-2xl shadow-sm lg:shadow-xl lg:backdrop-blur-md flex flex-col shrink-0 lg:max-h-[420px] lg:overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1B3A6B] lg:text-blue-400 mb-3" />
            <p className="text-sm font-bold">Carregando histórico de movimentações...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-bold">{error}</p>
            <button
              onClick={carregarHistorico}
              className="px-4 py-2 rounded-lg bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 text-slate-700 lg:text-slate-300 text-xs font-bold hover:bg-slate-200 hover:lg:bg-slate-800/60 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : movimentacoesFiltradas.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 text-slate-400 mx-auto flex items-center justify-center">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-700 lg:text-slate-300">Nenhuma movimentação encontrada</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Não foram encontrados registros para os filtros selecionados. Tente ajustar as datas ou o termo de busca.
            </p>
            {(search || dataInicio || dataFim || tipoFiltro !== "TODOS") && (
              <button
                onClick={() => {
                  setSearch("");
                  setDataInicio("");
                  setDataFim("");
                  setTipoFiltro("TODOS");
                }}
                className="mt-2 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 lg:text-slate-300 hover:bg-slate-50 hover:lg:bg-slate-800/60 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 transition-colors"
              >
                Limpar Todos os Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 lg:overflow-y-auto custom-scrollbar">
            {/* ─── Visão Mobile (Cards Auditáveis) ─── */}
            <div className="block lg:hidden space-y-4 p-2 pb-6 max-h-[55vh] overflow-y-auto no-scrollbar">
              {paginatedItems.map(m => (
                m.itens.map(item => {
                  const isEstorno = m.tipo === "ESTORNO";
                  return (
                  <div 
                    key={`${m.id}-${item.id}`} 
                    onClick={() => setExpandedId({ pedido: m, item })}
                    className="bg-blue-50/80 rounded-2xl p-4 shadow-sm border border-blue-200 flex flex-col relative overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 lg:text-white text-sm leading-tight">{item.nome}</h3>
                        <p className="font-mono text-[10px] font-bold text-slate-600 lg:text-slate-300 mt-0.5">{item.codigo}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider mb-1 ${item.tipo_baixa === 'QR_CODE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700 lg:text-slate-300'}`}>
                          {item.tipo_baixa === 'QR_CODE' ? '[QR CODE VERIFICADO]' : '[MANUAL]'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${m.tipo === 'ESTORNO' ? 'bg-red-100 text-red-800 border border-red-200' : m.tipo === 'ENTRADA' ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'}`}>
                          {m.tipo === 'ESTORNO' ? "ESTORNO" : m.tipo === 'ENTRADA' ? "ENTRADA" : "SAÍDA"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Grid de Informações de Rastreabilidade */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 lg:text-slate-300 border-t border-blue-200/60 pt-3">
                      <div className="flex flex-col">
                        <span className="text-slate-500 lg:text-slate-400 font-bold mb-0.5">Pedido & OP</span>
                        <span className="font-black text-slate-900 lg:text-white">#{m.id.toString().padStart(4, "0")} <span className="font-medium text-slate-500 lg:text-slate-400">| OP-2026-89</span></span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 lg:text-slate-400 font-bold mb-0.5">Quantidade</span>
                        <span className={`font-mono font-black ${isEstorno ? 'text-red-700' : 'text-[#1B3A6B] lg:text-blue-400'}`}>
                          {item.quantidadeEfetiva} <span className="text-[9px] font-bold text-slate-600 lg:text-slate-300">{item.unidade}</span>
                        </span>
                      </div>
                      
                      <div className="col-span-2 flex flex-col mt-1">
                        <span className="text-slate-500 lg:text-slate-400 font-bold mb-0.5">Solicitante ➔ Operador</span>
                        <span className="font-black text-slate-900 lg:text-white">{m.solicitante?.nome || "Responsável"} ➔ {m.operadorSolicitante || "Operador"}</span>
                      </div>

                      <div className="col-span-2 flex flex-col">
                        <span className="text-slate-500 lg:text-slate-400 font-bold mb-0.5">Almoxarife Responsável</span>
                        <span className="font-black text-slate-900 lg:text-white">{m.responsavel || "Almoxarife"}</span>
                      </div>

                      <div className="flex flex-col mt-1">
                        <span className="text-slate-500 lg:text-slate-400 font-bold mb-0.5">Data e Hora</span>
                        <span className="font-black text-slate-900 lg:text-white">{new Date(m.data).toLocaleDateString("pt-BR")} às {new Date(m.data).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"})}</span>
                      </div>
                      <div className="flex flex-col mt-1 items-end justify-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-200/70 text-slate-600 lg:text-slate-300">
                          TOTVS: Integrado
                        </span>
                      </div>
                    </div>
                  </div>
                )})
              ))}
            </div>

            {/* ─── Visão Desktop (Tabela original) ─── */}
            <div className="hidden lg:block w-full">
              <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 lg:bg-[#111827]">
                <tr className="border-b border-slate-200 lg:border-slate-800 lg:text-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500 lg:text-slate-400">
                  <th className="py-3 px-5 lg:text-slate-300 lg:border-slate-800">Pedido</th>
                  <th className="py-3 px-4 lg:text-slate-300 lg:border-slate-800">Data / Hora</th>
                  <th className="py-3 px-4 lg:text-slate-300 lg:border-slate-800">Tipo</th>
                  <th className="py-3 px-4 lg:text-slate-300 lg:border-slate-800">Solicitante / Setor</th>
                  <th className="py-3 px-4 text-center lg:text-slate-300 lg:border-slate-800">Itens / Qtd</th>
                  <th className="py-3 px-4 lg:text-slate-300 lg:border-slate-800">Motivo / Observação</th>
                  <th className="py-3 px-4 text-right lg:text-slate-300 lg:border-slate-800">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 lg:divide-slate-800/60 text-xs">
                {paginatedItems.map((m, index) => {
                  const isExpanded = expandedId === m.id;
                  const isEstorno = m.tipo === "ESTORNO";

                  return (
                    <React.Fragment key={`${m.id}-${index}`}>
                      <tr 
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className={`hover:bg-slate-50 hover:lg:bg-white/5 lg:text-slate-300 transition-colors cursor-pointer bg-white lg:bg-transparent border-b border-slate-100 lg:border-slate-800/60 ${
                          isExpanded ? "bg-slate-50 lg:bg-white/5 lg:text-white" : ""
                        }`}
                      >
                        {/* ID Pedido */}
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-900 lg:text-white whitespace-nowrap">
                          <span className="px-2 py-1 rounded-md bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 border border-slate-200">
                            #{m.id.toString().padStart(4, "0")}
                          </span>
                        </td>

                        {/* Data / Hora */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-800 lg:text-white">
                            {new Date(m.data).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {new Date(m.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>

                        {/* Tipo de Movimentação */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {m.tipo === "ESTORNO" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-red-50 text-red-700 border border-red-200">
                              <Undo2 className="w-3 h-3" />
                              Estorno
                            </span>
                          ) : m.tipo === "ENTRADA" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                              <ArrowUpRight className="w-3 h-3" />
                              Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <PackageCheck className="w-3 h-3" />
                              Saída
                            </span>
                          )}
                        </td>

                        {/* Solicitante / Setor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800 lg:text-white">{m.solicitante.nome}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 text-slate-600 lg:text-slate-300 font-medium">
                              {m.solicitante.setor}
                            </span>
                          </div>
                        </td>

                        {/* Itens / Volume */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-mono font-black text-slate-800 lg:text-white text-sm">
                            {m.totalQuantidade}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {m.totalItens} {m.totalItens === 1 ? "peça" : "peças"}
                          </span>
                        </td>

                        {/* Motivo ou Observação */}
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 lg:text-slate-300">
                          {m.motivo ? (
                            <span className={`inline-block truncate ${isEstorno ? "text-red-700 font-medium" : "text-slate-600 lg:text-slate-300"}`}>
                              {m.motivo}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sem observações</span>
                          )}
                        </td>

                        {/* Botão Expandir */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            className="p-1 rounded-md hover:bg-slate-200 hover:lg:bg-slate-800/60/60 text-slate-500 lg:text-slate-400 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                          >
                            <span>Itens</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                      </tr>

                      {/* ── Detalhes Expansíveis da Linha ── */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan="7" className="p-0 bg-slate-50 lg:bg-transparent border-b border-slate-200 lg:border-none">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="p-4 sm:p-5 space-y-3 lg:w-full lg:bg-slate-950/60 lg:p-4 lg:border-t lg:border-slate-800/80 lg:rounded-b-xl"
                              >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs border-b border-slate-200/80 pb-2 lg:text-xs lg:font-semibold lg:text-slate-400 lg:uppercase lg:mb-3 lg:flex lg:items-center lg:justify-between lg:border-b lg:border-slate-800/60 lg:pb-2">
                                  <div className="font-bold text-slate-700 lg:text-slate-400 flex items-center gap-2">
                                    <span>Itens da Movimentação · {m.itens.length} SKUs</span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-500 lg:text-slate-400 lg:normal-case">Responsável: <strong className="lg:uppercase">{m.responsavel}</strong></span>
                                  </div>
                                  {m.motivo && (
                                    <div className="mt-1 sm:mt-0 text-[11px] text-slate-600 lg:text-slate-400 lg:normal-case">
                                      <strong className="lg:uppercase">Motivo/Nota:</strong> {m.motivo}
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2.5 lg:gap-3 lg:w-full">
                                  {m.itens.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between lg:bg-slate-800/60 lg:border lg:border-slate-700/60 lg:rounded-xl lg:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:shadow-sm lg:hover:bg-slate-800/90 lg:transition-all lg:w-full"
                                    >
                                      <div className="flex justify-between items-start mb-2 lg:mb-0 lg:flex-col lg:items-start lg:flex-1 lg:min-w-0">
                                        <div className="min-w-0 pr-2 lg:pr-0">
                                          <p className="font-bold text-slate-800 lg:text-white text-xs lg:text-sm lg:font-semibold truncate">{item.nome}</p>
                                          <div className="flex items-center gap-2 mt-0.5 text-[10px] lg:text-xs text-slate-400 font-mono lg:font-sans lg:flex lg:gap-2 lg:mt-1">
                                            <span>Cód: {item.codigo}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5">
                                              <MapPin className="w-2.5 h-2.5 lg:hidden" />
                                              {item.localizacao}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0 lg:hidden">
                                          <p className="text-[9px] font-black uppercase text-slate-400">Qtd</p>
                                          <p className={`font-mono font-black text-sm ${isEstorno ? "text-red-600" : "text-[#1B3A6B]"}`}>
                                            {item.quantidadeEfetiva} <span className="text-[10px] font-normal text-slate-500">{item.unidade}</span>
                                          </p>
                                        </div>
                                      </div>

                                      {/* Quantidade Desktop */}
                                      <div className="hidden lg:block text-right shrink-0">
                                        <p className="text-base font-bold text-blue-400">
                                          {item.quantidadeEfetiva} <span className="text-xs text-slate-400 ml-1">{item.unidade}</span>
                                        </p>
                                      </div>

                                      {/* Detalhes da Baixa (QR Code) - Apenas Mobile */}
                                      {!isEstorno && (
                                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5 lg:hidden">
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-slate-500 uppercase flex items-center gap-1">
                                              <Tag className="w-3 h-3 text-indigo-500" /> Baixa:
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded font-black ${item.tipo_baixa === 'QR_CODE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'}`}>
                                              {item.tipo_baixa === 'QR_CODE' ? 'QR Code' : 'Manual'}
                                            </span>
                                          </div>
                                          {item.data_hora_baixa && (
                                            <div className="text-[10px] text-slate-500 flex justify-between">
                                              <span className="font-medium">Data:</span>
                                              <span>{new Date(item.data_hora_baixa).toLocaleString('pt-BR')}</span>
                                            </div>
                                          )}
                                          {item.almoxarifeNome && (
                                            <div className="text-[10px] text-slate-500 flex justify-between">
                                              <span className="font-medium">Almoxarife:</span>
                                              <span>{item.almoxarifeNome}</span>
                                            </div>
                                          )}
                                          {item.observacao_baixa && (
                                            <div className="text-[10px] text-slate-600 bg-amber-50 p-1.5 rounded border border-amber-100 mt-1">
                                              <strong className="text-amber-800">Obs:</strong> {item.observacao_baixa}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      {/* Modal de Auditoria Mobile */}
      <AnimatePresence>
        {expandedId && typeof expandedId === 'object' && expandedId.pedido && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedId(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 bg-white lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 rounded-t-3xl shadow-2xl z-50 p-5 lg:hidden max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />
              
              <h2 className="text-lg font-black text-slate-900 lg:text-white mb-1">Linha do Tempo - Pedido #{expandedId.pedido.id.toString().padStart(4, "0")}</h2>
              <p className="text-xs font-bold text-slate-500 lg:text-slate-400 mb-6">{expandedId.item.nome}</p>

              <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-4">
                {/* Etapa 1: Criação */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-blue-500" />
                  <p className="text-xs font-bold text-slate-800 lg:text-white">Pedido Criado</p>
                  <p className="text-[11px] text-slate-500 lg:text-slate-400 mt-1">
                    Criado por <strong>{expandedId.pedido.solicitante?.nome || "Responsável"}</strong> para o operador <strong>{expandedId.pedido.operadorSolicitante || "Operador"}</strong> em {new Date(expandedId.pedido.data).toLocaleString("pt-BR")}.
                  </p>
                </div>

                {/* Etapa 2: Separação/Baixa */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-emerald-500" />
                  <p className="text-xs font-bold text-slate-800 lg:text-white">Estoque Movimentado</p>
                  <p className="text-[11px] text-slate-500 lg:text-slate-400 mt-1">
                    {expandedId.item.tipo_baixa === 'QR_CODE' ? "Separado e Lido via QR Code" : "Baixa manual realizada"} por <strong>{expandedId.pedido.responsavel || "Almoxarife"}</strong> em {expandedId.item.data_hora_baixa ? new Date(expandedId.item.data_hora_baixa).toLocaleString("pt-BR") : new Date(expandedId.pedido.data).toLocaleString("pt-BR")}.
                  </p>
                </div>

                {/* Etapa 3: Obs/Estorno */}
                {(expandedId.pedido.motivo || expandedId.item.observacao_baixa) && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-amber-500" />
                    <p className="text-xs font-bold text-slate-800 lg:text-white">Observações Registradas</p>
                    <p className="text-[11px] text-slate-600 lg:text-slate-300 mt-1 bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 p-2 rounded-lg border border-slate-100">
                      {expandedId.pedido.motivo || expandedId.item.observacao_baixa}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setExpandedId(null)}
                className="w-full py-3 bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 hover:bg-slate-200 hover:lg:bg-slate-800/60 text-slate-700 lg:text-slate-300 rounded-xl font-bold text-sm mt-4 transition-colors"
              >
                Fechar Detalhes
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
