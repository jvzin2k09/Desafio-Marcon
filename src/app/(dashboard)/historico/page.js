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
  Tag
} from "lucide-react";

export default function HistoricoPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("TODOS"); // 'TODOS' | 'SAIDA' | 'ESTORNO'
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Expansão de detalhes
  const [expandedId, setExpandedId] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    <div className="h-[calc(100vh-80px)] flex flex-col space-y-6 max-w-7xl mx-auto pb-4 p-4 md:p-6">
      {/* ─── Topo: Título e Ação de Exportar ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--primary)] rounded-xl shadow-lg border-2 border-white text-white">
            <History className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[var(--primary)] tracking-tight">
              Histórico de Movimentações & Estornos
            </h1>
            <p className="text-slate-600 text-sm mt-0.5 font-medium">
              Auditoria e rastreamento completo de saídas, entregas no balcão e devoluções.
            </p>
          </div>
        </div>

        {/* Botão Exportar Excel */}
        <div className="flex items-center gap-2">
          <button
            onClick={carregarHistorico}
            disabled={loading}
            className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-sm disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#1B3A6B]" : ""}`} />
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportarParaExcel}
            disabled={loading || movimentacoesFiltradas.length === 0 || exporting}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm tracking-wide shadow-md transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #107C41 0%, #0d6334 100%)" }}
          >
            <FileSpreadsheet className="w-5 h-5 text-white" />
            <span>{exporting ? "Gerando..." : "Exportar para Excel"}</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20 font-mono">
              {movimentacoesFiltradas.length}
            </span>
          </motion.button>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="site-card p-5 bg-[var(--primary)] text-white shadow-md border-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-12 -mt-12" />
          <div className="flex justify-between items-center text-slate-300 mb-2 relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider">Movimentações</span>
            <Layers className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-2xl font-mono font-black text-white relative z-10">{kpis.total}</div>
          <span className="text-[11px] text-slate-300 font-medium relative z-10">Registros no período</span>
        </div>

        <div className="site-card p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-transparent shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-10 rounded-full -mr-12 -mt-12" />
          <div className="flex justify-between items-center mb-2 relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Entregas / Saídas</span>
            <PackageCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-black text-white relative z-10">{kpis.saidas}</div>
          <span className="text-[11px] text-slate-400 font-medium relative z-10">Pedidos concluídos</span>
        </div>

        <div className="site-card p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-transparent shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500 opacity-10 rounded-full -mr-12 -mt-12" />
          <div className="flex justify-between items-center mb-2 relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-red-400">Estornos / Cancelados</span>
            <Undo2 className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-mono font-black text-white relative z-10">{kpis.estornos}</div>
          <span className="text-[11px] text-slate-400 font-medium relative z-10">Devoluções ao estoque</span>
        </div>

        <div className="site-card p-5 bg-[var(--highlight)] text-white shadow-md border-transparent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12" />
          <div className="flex justify-between items-center text-orange-100 mb-2 relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider">Volume de Peças</span>
            <Tag className="w-4 h-4 text-orange-100" />
          </div>
          <div className="text-2xl font-mono font-black text-white relative z-10">{kpis.totalPecas}</div>
          <span className="text-[11px] text-orange-100 font-medium relative z-10">Unidades movimentadas</span>
        </div>
      </div>

      {/* ─── Barra de Filtros e Busca ─────────────────────────────────────── */}
      <div className="site-card p-5 bg-white/90 backdrop-blur-md shadow-sm space-y-4 shrink-0">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Abas de Tipo */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 self-start">
            <button
              onClick={() => { setTipoFiltro("TODOS"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tipoFiltro === "TODOS"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas ({movimentacoes.length})
            </button>
            <button
              onClick={() => { setTipoFiltro("SAIDA"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tipoFiltro === "SAIDA"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Saídas
            </button>
            <button
              onClick={() => { setTipoFiltro("ESTORNO"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tipoFiltro === "ESTORNO"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-red-700 hover:bg-red-50"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A6B] focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Filtro por Período de Data ── */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-[#1B3A6B]" /> Filtrar Data:
            </span>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400 text-[10px] font-bold">DE</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-mono font-medium text-slate-700 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400 text-[10px] font-bold">ATÉ</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-mono font-medium text-slate-700 outline-none"
              />
            </div>

            {(dataInicio || dataFim) && (
              <button
                onClick={() => aplicarAtalhoData("limpar")}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-1"
                title="Limpar filtro de data"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Atalhos Rápidos */}
          <div className="flex items-center gap-1 text-slate-500 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Atalhos:</span>
            <button
              onClick={() => aplicarAtalhoData("hoje")}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors text-[11px]"
            >
              Hoje
            </button>
            <button
              onClick={() => aplicarAtalhoData(7)}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors text-[11px]"
            >
              7 dias
            </button>
            <button
              onClick={() => aplicarAtalhoData(30)}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors text-[11px]"
            >
              30 dias
            </button>
            <button
              onClick={() => aplicarAtalhoData("mes")}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors text-[11px]"
            >
              Este Mês
            </button>
          </div>
        </div>
      </div>

      {/* ─── Tabela de Movimentações ─────────────────────────────────────── */}
      <div className="site-card flex-1 bg-white flex flex-col overflow-hidden shadow-sm min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1B3A6B] mb-3" />
            <p className="text-sm font-bold">Carregando histórico de movimentações...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-bold">{error}</p>
            <button
              onClick={carregarHistorico}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : movimentacoesFiltradas.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-700">Nenhuma movimentação encontrada</h3>
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
                className="mt-2 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Limpar Todos os Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Pedido</th>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Solicitante / Setor</th>
                  <th className="py-3 px-4 text-center">Itens / Qtd</th>
                  <th className="py-3 px-4">Motivo / Observação</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedItems.map((m) => {
                  const isExpanded = expandedId === m.id;
                  const isEstorno = m.tipo === "ESTORNO";

                  return (
                    <React.Fragment key={m.id}>
                      <tr 
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isExpanded ? "bg-slate-50/60" : ""
                        }`}
                      >
                        {/* ID Pedido */}
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200">
                            #{m.id.toString().padStart(4, "0")}
                          </span>
                        </td>

                        {/* Data / Hora */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-800">
                            {new Date(m.data).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {new Date(m.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>

                        {/* Tipo de Movimentação */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isEstorno ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-red-50 text-red-700 border border-red-200">
                              <Undo2 className="w-3 h-3" />
                              Estorno
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <PackageCheck className="w-3 h-3" />
                              Saída
                            </span>
                          )}
                        </td>

                        {/* Solicitante / Setor */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{m.solicitante.nome}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {m.solicitante.setor}
                            </span>
                          </div>
                        </td>

                        {/* Itens / Volume */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-mono font-black text-slate-800 text-sm">
                            {m.totalQuantidade}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {m.totalItens} {m.totalItens === 1 ? "peça" : "peças"}
                          </span>
                        </td>

                        {/* Motivo ou Observação */}
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                          {m.motivo ? (
                            <span className={`inline-block truncate ${isEstorno ? "text-red-700 font-medium" : "text-slate-600"}`}>
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
                            className="p-1 rounded-md hover:bg-slate-200/60 text-slate-500 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
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
                            <td colSpan="7" className="p-0 bg-slate-50/70 border-b border-slate-200">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="p-4 sm:p-5 space-y-3"
                              >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs border-b border-slate-200/80 pb-2">
                                  <div className="font-bold text-slate-700 flex items-center gap-2">
                                    <span>Itens da Movimentação · {m.itens.length} SKUs</span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-500">Responsável: <strong>{m.responsavel}</strong></span>
                                  </div>
                                  {m.motivo && (
                                    <div className="mt-1 sm:mt-0 text-[11px] text-slate-600">
                                      <strong>Motivo/Nota:</strong> {m.motivo}
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {m.itens.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="min-w-0 pr-2">
                                          <p className="font-bold text-slate-800 text-xs truncate">{item.nome}</p>
                                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                                            <span>Cód: {item.codigo}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5">
                                              <MapPin className="w-2.5 h-2.5" />
                                              {item.localizacao}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-[9px] font-black uppercase text-slate-400">Qtd</p>
                                          <p className={`font-mono font-black text-sm ${isEstorno ? "text-red-600" : "text-[#1B3A6B]"}`}>
                                            {item.quantidadeEfetiva} <span className="text-[10px] font-normal text-slate-500">{item.unidade}</span>
                                          </p>
                                        </div>
                                      </div>

                                      {/* Detalhes da Baixa (QR Code) */}
                                      {!isEstorno && (
                                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
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
        )}

        {/* ── Paginação ── */}
        {!loading && movimentacoesFiltradas.length > itemsPerPage && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-500">
            <div>
              Mostrando <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> a{" "}
              <strong>{Math.min(currentPage * itemsPerPage, movimentacoesFiltradas.length)}</strong> de{" "}
              <strong>{movimentacoesFiltradas.length}</strong> registros
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono font-bold text-slate-700 px-2">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
