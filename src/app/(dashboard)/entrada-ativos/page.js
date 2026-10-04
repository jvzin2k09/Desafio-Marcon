"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackagePlus, Upload, CheckCircle2, AlertCircle, Loader2,
  Search, Calendar, Hash, FileText, Package, RefreshCw, Building2,
  X, Plus, Minus
} from "lucide-react";

const SPRING = { type: "spring", stiffness: 280, damping: 24 };

const SETORES = [
  { value: "Geral", label: "Geral (Disponível para Todos)" },
  { value: "Usinagem", label: "Usinagem" },
  { value: "Logística", label: "Logística" },
  { value: "Manutenção", label: "Manutenção" },
  { value: "Montagem", label: "Montagem" },
];

function normalizarTexto(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function EntradaAtivosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Form state ──────────────────────────────────────
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("Geral");
  const [formLoading, setFormLoading] = useState(false);
  const [formStatus, setFormStatus] = useState(null);
  const [idDuplicado, setIdDuplicado] = useState(false);
  const [nomeDuplicado, setNomeDuplicado] = useState(false);

  // ── CSV state ───────────────────────────────────────
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const csvInputRef = useRef(null);

  // ── Table state ─────────────────────────────────────
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(true);
  const [searchTable, setSearchTable] = useState("");

  // ── Toast state ─────────────────────────────────────
  const [toast, setToast] = useState(null);

  // ── Modal Reposição ─────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [qtdReposicao, setQtdReposicao] = useState(1);
  const [motivoReposicao, setMotivoReposicao] = useState("Compra / Nota Fiscal");
  const [modalLoading, setModalLoading] = useState(false);

  // ── Guard: ADMIN only, desktop only ─────────────────
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [session, status, router]);

  // ── Responsive guard: redirect on mobile ────────────
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e) => { if (!e.matches) router.replace("/"); };
    if (!mq.matches) router.replace("/");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [router]);

  // ── Fetch items ─────────────────────────────────────
  const fetchItens = useCallback(async () => {
    setLoadingItens(true);
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setItens(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    } catch { }
    setLoadingItens(false);
  }, []);

  useEffect(() => { fetchItens(); }, [fetchItens]);

  // ── Show toast ──────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Submit form ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!codigo.trim() || !nome.trim()) return;
    
    // Validar duplicado por código
    const c = codigo.trim().toLowerCase();
    if (itens.some(i => i.codigo.toLowerCase() === c)) {
      setIdDuplicado(true);
      setNomeDuplicado(false);
      showToast(`❌ Erro: Já existe uma peça cadastrada com este código!`, "error");
      return;
    }

    // Validar duplicado por descrição
    const nomeNorm = normalizarTexto(nome);
    if (itens.some(i => normalizarTexto(i.nome) === nomeNorm)) {
      setNomeDuplicado(true);
      setIdDuplicado(false);
      showToast(`❌ Erro: Já existe uma peça cadastrada com esta descrição!`, "error");
      return;
    }
    
    setIdDuplicado(false);
    setNomeDuplicado(false);
    setFormLoading(true);
    setFormStatus(null);
    try {
      const res = await fetch("/api/items/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim(), nome: nome.trim(), setor }),
      });
      const data = await res.json();
      if (res.ok) {
        setFormStatus({ type: "success", msg: `Peça "${data.codigo}" cadastrada!` });
        setCodigo("");
        setNome("");
        setSetor("Geral");
        setIdDuplicado(false);
        setNomeDuplicado(false);
        showToast(`✅ Peça "${data.codigo}" cadastrada com sucesso no banco de dados!`);
        fetchItens();
      } else {
        // Marcar campo duplicado se backend retornar
        if (data.campo === 'codigo') setIdDuplicado(true);
        if (data.campo === 'nome') setNomeDuplicado(true);
        setFormStatus({ type: "error", msg: data.error || "Erro ao cadastrar." });
        showToast(`❌ ${data.error || "Erro ao cadastrar."}`, "error");
      }
    } catch {
      setFormStatus({ type: "error", msg: "Falha de conexão. Tente novamente." });
    } finally {
      setFormLoading(false);
    }
  };

  // ── CSV handler ─────────────────────────────────────
  const handleCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    setCsvResult(null);
    setFormStatus(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        setCsvResult({ type: "error", msg: "CSV vazio ou sem dados." });
        setCsvLoading(false);
        return;
      }
      const header = lines[0];
      const sep = header.includes(";") ? ";" : ",";
      const cols = header.split(sep).map(c => c.trim().toLowerCase().replace(/["']/g, ""));
      const codigoIdx = cols.findIndex(c => c.includes("codigo") || c.includes("código") || c === "id" || c === "cod");
      const nomeIdx = cols.findIndex(c => c.includes("nome") || c.includes("descri") || c.includes("peça") || c.includes("peca"));
      if (codigoIdx === -1 || nomeIdx === -1) {
        setCsvResult({ type: "error", msg: 'CSV deve ter colunas "codigo" e "nome" (ou "descrição").' });
        setCsvLoading(false);
        return;
      }
      const qtdIdx = cols.findIndex(c => c.includes("quantidade") || c === "qtd" || c === "qty");
      const caixaIdx = cols.findIndex(c => c.includes("caixa") || c.includes("qtd_por_caixa"));
      const unidIdx = cols.findIndex(c => c.includes("unidade") || c === "un");
      const locIdx = cols.findIndex(c => c.includes("local") || c.includes("localizacao") || c.includes("localização"));
      const setorIdx = cols.findIndex(c => c.includes("setor") || c.includes("categoria") || c.includes("departamento"));

      const parsedItens = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ""));
        if (!vals[codigoIdx] || !vals[nomeIdx]) continue;
        parsedItens.push({
          codigo: vals[codigoIdx],
          nome: vals[nomeIdx],
          quantidade: qtdIdx !== -1 ? vals[qtdIdx] : "0",
          qtd_por_caixa: caixaIdx !== -1 ? vals[caixaIdx] : "1",
          unidade: unidIdx !== -1 ? vals[unidIdx] : "UN",
          localizacao: locIdx !== -1 ? vals[locIdx] : "",
          setor: setorIdx !== -1 ? (vals[setorIdx] || "Geral") : "Geral",
        });
      }

      if (parsedItens.length === 0) {
        setCsvResult({ type: "error", msg: "Nenhum registro válido encontrado no CSV." });
        setCsvLoading(false);
        return;
      }

      const res = await fetch("/api/items/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lote: true, itens: parsedItens }),
      });
      const data = await res.json();
      if (res.ok) {
        const criados = data.criados || 0;
        const ignorados = data.ignorados || 0;
        setCsvResult({ type: "success", msg: `Processamento CSV concluído.` });
        if (ignorados > 0) {
          showToast(`✅ ${criados} peças cadastradas com sucesso! ⚠️ ${ignorados} itens foram ignorados por duplicidade de ID ou Descrição.`);
        } else {
          showToast(`✅ ${criados} peças cadastradas com sucesso!`);
        }
        fetchItens();
      } else {
        setCsvResult({ type: "error", msg: data.error || "Erro na importação." });
      }
    } catch {
      setCsvResult({ type: "error", msg: "Falha ao processar o arquivo." });
    } finally {
      setCsvLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // ── Modal Submit ────────────────────────────────────
  const handleEntrada = async () => {
    if (!itemSelecionado || qtdReposicao <= 0) return;
    setModalLoading(true);
    try {
      const res = await fetch("/api/items/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: itemSelecionado.id,
          quantidade: qtdReposicao,
          motivo: motivoReposicao
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Saldo de ${data.codigo} atualizado para ${data.novoSaldo} UN!`);
        setModalOpen(false);
        fetchItens();
      } else {
        showToast(`❌ ${data.error || "Erro ao registrar entrada."}`, "error");
      }
    } catch {
      showToast("❌ Erro de conexão.", "error");
    } finally {
      setModalLoading(false);
    }
  };

  // ── Filtered items ──────────────────────────────────
  const filteredItens = itens.filter(item =>
    item.nome.toLowerCase().includes(searchTable.toLowerCase()) ||
    item.codigo.toLowerCase().includes(searchTable.toLowerCase())
  );

  // ── Loading/Guard ───────────────────────────────────
  if (status === "loading" || !session || session.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  const SETOR_BADGE_COLORS = {
    "Geral": "bg-slate-500/10 text-slate-400 border-slate-500/20",
    "Usinagem": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Logística": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Manutenção": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Montagem": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <>
      {/* ── Toast Notification ───────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -40 }}
            className={`fixed top-6 left-1/2 z-[100] px-6 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border flex items-center gap-3 ${
              toast.type === "error"
                ? "bg-red-500/15 border-red-500/30 text-red-300"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
            }`}
            style={{ minWidth: 320, maxWidth: 600 }}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            )}
            <span className="text-sm font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden lg:flex flex-col space-y-6 h-[calc(100vh-80px)] overflow-hidden">
        {/* ── Header ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shrink-0 relative overflow-hidden"
        >
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-orange-500/8 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
              <PackagePlus className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Entrada de Ativos</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-0.5">
                Cadastro e gestão de novas peças no banco de dados
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Grid Principal (2 colunas) ──────────────────── */}
        <div className="flex-1 grid grid-cols-5 gap-6 min-h-0">

          {/* ── Coluna 1: Formulário + CSV ─────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.05 }}
            className="col-span-2 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl overflow-y-auto custom-scrollbar relative"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-orange-500/8 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

            {/* Section title */}
            <div className="relative z-10 mb-5">
              <h2 className="text-sm font-black text-white uppercase tracking-wide">Cadastro Manual</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Preencha os campos abaixo para registrar uma nova peça</p>
            </div>

            {/* Form */}
            <form className="relative z-10 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Código de Patrimônio (ID) *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={codigo}
                    onChange={e => {
                      setCodigo(e.target.value);
                      if (idDuplicado) setIdDuplicado(false);
                    }}
                    placeholder="Ex: TM-015"
                    className={`w-full bg-slate-800/80 border text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                      idDuplicado 
                        ? "border-red-500 focus:ring-red-500/50 focus:border-red-500/50" 
                        : "border-slate-700/80 focus:ring-orange-500/50 focus:border-orange-500/50"
                    }`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Descrição da Peça / Ferramenta *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={nome}
                    onChange={e => {
                      setNome(e.target.value);
                      if (nomeDuplicado) setNomeDuplicado(false);
                    }}
                    placeholder="Ex: Broca de Aço HSS 10mm"
                    className={`w-full bg-slate-800/80 border text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                      nomeDuplicado
                        ? "border-red-500 focus:ring-red-500/50 focus:border-red-500/50"
                        : "border-slate-700/80 focus:ring-orange-500/50 focus:border-orange-500/50"
                    }`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Setor Destino / Aplicação *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={setor}
                    onChange={e => setSetor(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all appearance-none cursor-pointer"
                    required
                  >
                    {SETORES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={formLoading || !codigo.trim() || !nome.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                {formLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PackagePlus className="w-4 h-4" />
                )}
                Registrar Nova Peça
              </motion.button>
            </form>

            {/* Form feedback */}
            <AnimatePresence>
              {formStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-3 flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border relative z-10 ${
                    formStatus.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {formStatus.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {formStatus.msg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Divider */}
            <div className="relative z-10 flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-700/80" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-slate-700/80" />
            </div>

            {/* CSV Import */}
            <div className="relative z-10">
              <div className="mb-3">
                <h2 className="text-sm font-black text-white uppercase tracking-wide">Importar Planilha</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Envie um arquivo CSV com colunas &quot;codigo&quot;, &quot;descricao&quot;, &quot;setor&quot;, &quot;quantidade&quot;</p>
              </div>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsv}
              />
              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => csvInputRef.current?.click()}
                disabled={csvLoading}
                className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {csvLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                📄 Importar Planilha (.CSV)
              </motion.button>

              <AnimatePresence>
                {csvResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-3 flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border ${
                      csvResult.type === "success"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {csvResult.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {csvResult.msg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Coluna 2: Tabela de ativos ─────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="col-span-3 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Table header */}
            <div className="p-5 pb-4 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wide">Peças Cadastradas</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Histórico completo de ativos no banco de dados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-slate-800 text-orange-400 border border-slate-700/50">
                    {itens.length}
                  </span>
                  <button
                    onClick={fetchItens}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingItens ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por código ou descrição..."
                  value={searchTable}
                  onChange={e => setSearchTable(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {/* Table content */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loadingItens ? (
                <div className="flex items-center justify-center h-40">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 animate-spin" />
                  </div>
                </div>
              ) : filteredItens.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                  <Package className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm font-bold">
                    {searchTable ? "Nenhum item encontrado" : "Nenhum ativo cadastrado"}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                    <tr className="border-b border-slate-800/80">
                      <th className="text-left whitespace-nowrap w-28 min-w-[110px] text-[10px] font-bold uppercase tracking-wider text-slate-500 px-5 py-3">Código ID</th>
                      <th className="text-left whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 px-5 py-3">Descrição</th>
                      <th className="text-left whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 px-5 py-3">Setor</th>
                      <th className="text-left whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 px-5 py-3">Qtd</th>
                      <th className="text-left whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 px-5 py-3">Data de Cadastro</th>
                      <th className="text-left whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 px-5 py-3">Status</th>
                      <th className="text-left whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-500 px-5 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItens.map((item, idx) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.015 }}
                        className="border-b border-slate-800/40 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                            {item.codigo}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-200 truncate block max-w-[280px]">
                            {item.nome}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                            SETOR_BADGE_COLORS[item.setor] || SETOR_BADGE_COLORS["Geral"]
                          }`}>
                            {item.setor || "Geral"}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {item.quantidade} {item.unidade}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "2-digit", year: "numeric"
                            })} {new Date(item.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            item.quantidade > 0
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.quantidade > 0 ? "bg-emerald-400" : "bg-red-400"}`} />
                            {item.quantidade > 0 ? "Em Estoque" : "Sem Estoque"}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setItemSelecionado(item);
                              setQtdReposicao(1);
                              setMotivoReposicao("Compra / Nota Fiscal");
                              setModalOpen(true);
                            }}
                            className="lg:bg-emerald-600/20 hover:lg:bg-emerald-600 lg:text-emerald-400 hover:lg:text-white lg:border lg:border-emerald-500/30 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            + Entrada
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile fallback (não deve aparecer pois redireciona, mas por segurança) */}
      <div className="flex lg:hidden items-center justify-center h-[60vh] text-slate-400">
        <p className="text-sm font-medium">Esta página está disponível apenas no computador.</p>
      </div>

      {/* ── Modal de Reposição ───────────────────────────── */}
      <AnimatePresence>
        {modalOpen && itemSelecionado && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Reposição de Estoque - <span className="text-emerald-400">{itemSelecionado.codigo}</span>
                    </h3>
                    <p className="text-sm font-medium text-slate-400 mt-1">
                      Item: {itemSelecionado.nome}
                    </p>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">Saldo Atual:</span>
                  <span className="text-2xl font-black text-white">
                    {itemSelecionado.quantidade} <span className="text-base text-slate-500">{itemSelecionado.unidade}</span>
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Quantidade a Adicionar *
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQtdReposicao(Math.max(1, qtdReposicao - 1))}
                        className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={qtdReposicao}
                        onChange={(e) => setQtdReposicao(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 h-12 bg-slate-800/80 border border-slate-700/80 text-white text-center text-lg font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setQtdReposicao(qtdReposicao + 1)}
                        className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Origem / Motivo *
                    </label>
                    <div className="relative">
                      <select
                        value={motivoReposicao}
                        onChange={(e) => setMotivoReposicao(e.target.value)}
                        className="w-full h-12 bg-slate-800/80 border border-slate-700/80 text-white rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Compra / Nota Fiscal">Compra / Nota Fiscal</option>
                        <option value="Devolução de Sobra">Devolução de Sobra</option>
                        <option value="Ajuste de Inventário">Ajuste de Inventário</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleEntrada}
                  disabled={modalLoading}
                  className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CONFIRMAR ENTRADA"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
