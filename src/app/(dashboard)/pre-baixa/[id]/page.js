"use client";
import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { ScanLine, AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, PackageCheck, AlertTriangle, RotateCcw, MapPin, Package, Lightbulb, Recycle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SPRING = { type: "spring", stiffness: 280, damping: 24 };

// ─── Linha de item ────────────────────────────────────────────────────────────
function ItemRow({ pi, index, pedido }) {
  const solicitado = pi.quantidade;
  const separado = pi.quantidadeEnviada ?? pi.quantidade;
  const diverge = separado !== solicitado;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING, delay: index * 0.05 }}
      className="p-5 rounded-xl border transition-colors"
      style={{
        background: diverge ? "#FFF7ED" : "#FFFFFF",
        borderColor: diverge ? "#FED7AA" : "#E2E8F0",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-800 lg:text-white">{pi.item.nome}</h3>
          <p className="text-sm font-mono text-slate-500 lg:text-slate-400 mt-0.5">
            Cód: {pi.item.codigo} · Loc: {pi.item.localizacao || '—'}
          </p>
        </div>

        {/* Bloco comparativo */}
        <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-white border border-slate-200 shadow-sm lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200">
          <div className="text-center min-w-[68px]">
            <p className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-400 mb-1">Solicitado</p>
            <p className="text-2xl font-mono font-black text-slate-700 lg:text-slate-300">{solicitado}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="text-center min-w-[68px]">
            <p className={`text-[9px] font-mono font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1 ${diverge ? 'text-orange-600' : 'text-slate-400'}`}>
              {diverge && <AlertTriangle className="w-3 h-3" />}
              {diverge ? 'Divergência' : 'Separado'}
            </p>
            <p className={`text-2xl font-mono font-black ${diverge ? 'text-orange-600' : 'text-primary'}`}>
              {separado}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Visual de Origem (Roteamento Prioritário) */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
        {pi.qtd_alternativo > 0 && pi.qtd_caixas_central === 0 && (
          <div className="text-sm font-medium text-slate-700 lg:text-slate-300 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600 shrink-0" />
            <span>Retirar {pi.qtd_alternativo} UN no Almoxarifado Alternativo (Box Sobras {pedido?.setor || "Local"})</span>
          </div>
        )}
        
        {pi.qtd_caixas_central > 0 && (
          <div className="text-sm font-medium text-slate-700 lg:text-slate-300 bg-blue-50 border border-blue-200 p-3 rounded-lg flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600 shrink-0" />
              Retirar {pi.qtd_caixas_central} CX ({pi.qtd_caixas_central * (pi.item.qtd_por_caixa || 1)} UN) na Prateleira {pi.item.localizacao || "Central"}.
            </span>
            {pi.sobra_gerada > 0 && (
              <span className="text-xs text-blue-600 font-bold ml-6 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" />
                {pi.sobra_gerada} UN sobrantes serão enviadas ao Alternativo
              </span>
            )}
            {pi.qtd_alternativo > 0 && (
              <span className="text-xs text-slate-500 lg:text-slate-400 font-bold ml-6">E completar com {pi.qtd_alternativo} UN do Alternativo.</span>
            )}
          </div>
        )}

        {pi.qtd_alternativo > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-1 rounded w-fit">
            <Recycle className="w-3.5 h-3.5" />
            Economia: Retirado do Estoque Alternativo
          </span>
        )}
      </div>

      {diverge && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 flex items-center gap-2 text-orange-700 text-sm font-bold px-4 py-2.5 rounded-lg bg-orange-50 border border-orange-200"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {separado > solicitado
            ? `Quantidade separada é ${separado - solicitado} un. MAIOR que a solicitada.`
            : `Quantidade separada é ${solicitado - separado} un. MENOR que a solicitada.`}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function PreBaixaCheckout({ params }) {
  const { id } = use(params);
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/separacao/${id}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setPedido(data); setLoading(false); });
  }, [id]);

  const handleConfirmarBaixa = async () => {
    setSubmitting(true);
    setMessage(null);
    const itensEnviados = pedido.itens.map(pi => ({
      id: pi.id,
      quantidadeEnviada: pi.quantidadeEnviada ?? pi.quantidade,
    }));
    try {
      const res = await fetch(`/api/separacao/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itensEnviados }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao processar a baixa.' });
        setSubmitting(false);
      } else {
        setMessage({ type: 'success', text: 'Baixa confirmada! Redirecionando...' });
        setTimeout(() => router.push('/pedidos'), 1400);
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
      setSubmitting(false);
    }
  };

  const handleVoltarSeparacao = async () => {
    setSubmitting(true);
    await fetch('/api/pedidos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pedido.id, status: 'SEPARACAO' }),
    });
    router.push('/pedidos');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-primary" />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 rounded-xl bg-white border border-slate-200 text-center shadow-sm lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200">
        <p className="text-slate-500 lg:text-slate-400">Pedido não encontrado.</p>
        <Link href="/pedidos" className="text-primary mt-4 inline-block hover:underline font-bold">← Voltar</Link>
      </div>
    );
  }

  const totalItens = pedido.itens.length;
  const divergentes = pedido.itens.filter(pi => (pi.quantidadeEnviada ?? pi.quantidade) !== pi.quantidade).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Voltar */}
      <Link href="/pedidos"
        className="inline-flex items-center text-xs font-bold text-slate-500 lg:text-slate-400 hover:text-primary transition-colors gap-1.5 uppercase tracking-widest">
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar ao Kanban
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 lg:text-slate-200">
            <ScanLine className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Terminal de Conferência
            </p>
            <h2 className="text-3xl font-display font-black text-slate-900 lg:text-white tracking-tight">
              Pedido #{pedido.id.toString().padStart(4, '0')}
            </h2>
            <p className="text-sm text-slate-500 lg:text-slate-400 font-medium mt-0.5">
              {pedido.user?.nome} · {totalItens} SKUs
              {divergentes > 0 && <span className="ml-2 text-orange-600 font-bold">· {divergentes} divergência(s)</span>}
            </p>
          </div>
        </div>

        <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border ${
          divergentes > 0
            ? 'bg-orange-50 border-orange-200 text-orange-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {divergentes > 0 ? (
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Divergências Detectadas</span>
          ) : (
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Tudo Conferido</span>
          )}
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 font-bold border ${
            message.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {message.text}
        </motion.div>
      )}

      {/* Painel Principal */}
      <div className="bg-white lg:bg-slate-900/80 lg:backdrop-blur-md lg:shadow-xl lg:border-slate-800/80 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 lg:bg-slate-800 lg:border-slate-700 lg:text-slate-200 flex justify-between items-center border-b border-slate-200">
          <span className="text-xs font-black text-slate-500 lg:text-slate-400 uppercase tracking-widest">Resumo de Itens</span>
          <span className="text-xs font-mono font-bold text-slate-400">{totalItens} SKU{totalItens !== 1 ? 's' : ''}</span>
        </div>

        <div className="p-6 space-y-3">
          {pedido.itens.map((pi, i) => <ItemRow key={pi.id} pi={pi} index={i} pedido={pedido} />)}
        </div>

        {/* CTAs */}
        <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-3 border-t border-slate-100 pt-6">
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleVoltarSeparacao}
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-slate-100 lg:bg-slate-800/60 lg:border lg:border-slate-700/50 text-slate-700 lg:text-slate-300 border border-slate-200 hover:bg-slate-200 hover:lg:bg-slate-800/60 transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            Voltar p/ Separação
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirmarBaixa}
            disabled={submitting}
            className="btn-magnetic relative flex-1 flex items-center justify-center gap-3 py-5 rounded-xl font-black text-lg uppercase tracking-wide text-white overflow-hidden disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #1B3A6B 0%, #1e5fa8 100%)",
              boxShadow: "0 4px 24px rgba(27,58,107,0.3)",
            }}
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <PackageCheck className="w-6 h-6" />
                Confirmar Baixa no Estoque
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
