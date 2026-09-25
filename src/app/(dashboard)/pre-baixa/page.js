"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ScanLine, Search, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PreBaixaPage() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setItems(data);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!selectedItem || !quantidade || quantidade <= 0) {
      setMessage({ type: 'error', text: 'Selecione um item e informe uma quantidade válida.' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItem, quantidade }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao realizar baixa.' });
      } else {
        setMessage({ type: 'success', text: 'Baixa realizada com sucesso!' });
        setSelectedItem("");
        setQuantidade("");
        // Atualizar lista de itens para pegar a quantidade atualizada
        const itemsRes = await fetch('/api/items');
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    }
    setLoading(false);
  };

  const selectedItemData = items.find(i => i.id.toString() === selectedItem);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-md mx-auto space-y-6"
    >
      <div className="flex items-center space-x-3 mb-2">
        <ScanLine className="w-8 h-8 text-primary" />
        <h2 className="text-2xl font-display font-bold text-slate-800">Nova Baixa</h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {message && (
            <div className={`p-4 rounded-lg flex items-start space-x-3 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Selecione o Item</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
              >
                <option value="">Selecione...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedItemData && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center">
              <span className="text-sm text-slate-500 font-medium">Estoque Atual:</span>
              <span className="text-lg font-bold text-primary">{selectedItemData.quantidade} un</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Quantidade a Retirar</label>
            <input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Ex: 5"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-primary text-white font-bold py-3.5 rounded-lg hover:bg-accent transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              "Confirmar Baixa"
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
