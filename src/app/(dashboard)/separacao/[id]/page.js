"use client";
import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { CheckSquare, Square, PackageCheck, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SeparacaoPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [pedido, setPedido] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`/api/separacao/${id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setPedido(data);
        setLoading(false);
      });
  }, [id]);

  const toggleCheck = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleQuantidadeEnviadaChange = (itemId, value) => {
    setPedido(prev => {
      const newItens = prev.itens.map(item => {
        if (item.id === itemId) {
          return { ...item, quantidadeEnviada: parseInt(value) || 0 };
        }
        return item;
      });
      return { ...prev, itens: newItens };
    });
  };

  const handleConcluir = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const itensEnviados = pedido.itens.map(item => ({
        id: item.id,
        quantidadeEnviada: item.quantidadeEnviada !== undefined ? item.quantidadeEnviada : item.quantidade
      }));

      const res = await fetch(`/api/separacao/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itensEnviados })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao concluir separação.' });
        setSubmitting(false);
      } else {
        setMessage({ type: 'success', text: 'Separação e Baixa concluídas com sucesso!' });
        setTimeout(() => {
          router.push('/historico');
        }, 1500);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-accent"></div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="bg-white p-12 rounded-lg border border-border text-center shadow-sm max-w-3xl mx-auto mt-8">
        <p className="text-slate-500 font-medium text-lg">Pedido não encontrado.</p>
      </div>
    );
  }

  const allChecked = pedido.itens.length > 0 && pedido.itens.every(item => checkedItems[item.id]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto space-y-6 pb-20"
    >
      <Link href="/pedidos" className="inline-flex items-center text-slate-500 hover:text-accent font-bold transition-all hover:-translate-x-1 text-sm mb-2">
        <ArrowLeft className="w-5 h-5 mr-1.5" />
        Voltar para Pedidos
      </Link>
      
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 bg-white rounded-md shadow-sm border border-border">
          <PackageCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">
          Separação: #{pedido.id.toString().padStart(4, '0')}
        </h2>
      </div>

      <div className="bg-white border border-border rounded-lg p-6 sm:p-10 shadow-sm">
        <div className="mb-8 pb-6 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Solicitante</p>
            <p className="font-black text-xl text-slate-900">{pedido.user.nome}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data do Pedido</p>
            <p className="font-black text-xl text-slate-900">{new Date(pedido.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-md flex items-start space-x-4 mb-8 border-2 ${message.type === 'error' ? 'bg-red-50/50 text-red-700 border-red-200' : 'bg-green-50/50 text-green-700 border-green-200'}`}
          >
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <span className="text-base font-bold">{message.text}</span>
          </motion.div>
        )}

        <div className="space-y-4">
          {pedido.itens.map((pedidoItem, index) => {
            const isChecked = checkedItems[pedidoItem.id] || false;
            const qtdeEnviada = pedidoItem.quantidadeEnviada !== undefined ? pedidoItem.quantidadeEnviada : pedidoItem.quantidade;
            const diff = qtdeEnviada - pedidoItem.quantidade;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={pedidoItem.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-md border-2 transition-all duration-300 ease-out ${isChecked ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-slate-50/50 border-border'}`}
              >
                <div 
                  className="flex items-start space-x-5 cursor-pointer flex-1 min-h-[44px]"
                  onClick={() => toggleCheck(pedidoItem.id)}
                >
                  <div className="mt-1 shrink-0 transition-transform active:scale-90">
                    {isChecked ? (
                      <CheckSquare className="w-7 h-7 text-primary" />
                    ) : (
                      <Square className="w-7 h-7 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-black text-lg sm:text-xl transition-colors ${isChecked ? 'text-primary' : 'text-slate-900'}`}>
                      {pedidoItem.item.nome}
                    </h4>
                    <p className="text-sm font-medium text-slate-500 mb-2">Cód: {pedidoItem.item.codigo}</p>
                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500">
                      Solicitado: <span className="text-slate-800 ml-1.5 text-sm">{pedidoItem.quantidade} un</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 sm:mt-0 flex items-center justify-end bg-white p-3 sm:p-4 rounded-md border border-slate-200 ml-[48px] sm:ml-4 shadow-sm min-h-[44px]">
                  <div className="text-right">
                    <label className="text-[10px] font-black text-primary block uppercase tracking-widest mb-1.5 opacity-80">
                      Enviado (un)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={qtdeEnviada}
                      onChange={(e) => handleQuantidadeEnviadaChange(pedidoItem.id, e.target.value)}
                      className={`w-28 text-right font-black text-2xl py-1 px-2 border-b-2 bg-transparent focus:outline-none transition-colors ${diff !== 0 ? 'border-accent text-accent' : 'border-slate-200 text-slate-800 focus:border-primary focus:text-primary'}`}
                      disabled={isChecked}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 pt-8 border-t border-border">
          <button 
            onClick={handleConcluir}
            disabled={!allChecked || submitting}
            className="w-full bg-accent hover:brightness-110 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-black py-5 rounded-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.99] shadow-md disabled:cursor-not-allowed flex justify-center items-center text-lg tracking-wide uppercase"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              "Finalizar e Dar Baixa"
            )}
          </button>
          {!allChecked && (
            <p className="text-center font-bold text-sm text-slate-400 mt-4 tracking-wide">
              * Marque todos os itens como separados (✓) para liberar o botão.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
