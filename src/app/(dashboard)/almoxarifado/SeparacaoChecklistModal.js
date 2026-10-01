import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Camera, PackageCheck, Loader2 } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";

export function SeparacaoChecklistModal({ pedido, onClose, onSuccess }) {
  const [itens, setItens] = useState(
    pedido.itens.map((i) => {
      const isBaixado = !!i.data_hora_baixa;
      return {
        ...i,
        statusLocal: isBaixado ? "CONCLUIDO" : "PENDENTE",
        quantidadeBaixa: isBaixado ? i.quantidadeEnviada : i.quantidade,
        observacao: i.observacao_baixa || "",
        qrValido: isBaixado,
        reposicaoSolicitada: false,
      };
    })
  );

  const [filtro, setFiltro] = useState("PENDENTES");
  const [scannerAtivo, setScannerAtivo] = useState(null);
  const [scanError, setScanError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const containerRef = useRef(null);

  const pendentesCount = itens.filter((i) => i.statusLocal === "PENDENTE").length;
  const concluidosCount = itens.filter((i) => i.statusLocal === "CONCLUIDO").length;
  const totalCount = itens.length;

  const itensFiltrados = itens.filter((i) => {
    if (filtro === "PENDENTES") return i.statusLocal === "PENDENTE";
    if (filtro === "CONCLUIDOS") return i.statusLocal === "CONCLUIDO";
    return true;
  });

  const handleScan = (result, item) => {
    if (result && result[0]) {
      const code = result[0].rawValue;
      if (code === item.item.codigo) {
        setScannerAtivo(null);
        setScanError("");
        setItens((prev) => prev.map((p) => (p.id === item.id ? { ...p, qrValido: true } : p)));
      } else {
        setScanError(`Produto Incorreto! Bipado: ${code}, Esperado: ${item.item.codigo}`);
      }
    }
  };

  const handleConfirmItem = (itemId) => {
    setItens((prev) =>
      prev.map((p) => {
        if (p.id === itemId) {
          return { ...p, statusLocal: "CONCLUIDO" };
        }
        return p;
      })
    );
    // Auto-scroll logic is complex in a simple replace, but we can attempt to scroll to top after a short delay
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 150);
  };

  const handleFinalizar = async () => {
    setLoading(true);
    try {
      const itensBaixados = itens.map((i) => ({
        pedidoItemId: i.id,
        itemId: i.itemId,
        quantidadeBaixa: i.quantidadeBaixa,
        observacao_baixa: i.observacao,
      }));

      const res = await fetch("/api/pedidos/baixa-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: pedido.id,
          itensBaixados,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const d = await res.json();
        alert(d.error || "Erro ao finalizar requisição.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarReposicao = (item) => {
    setToastMessage({
      produto: item.item.nome,
      codigo: item.item.codigo,
      setor: pedido.setor || "Geral",
      requisicao: `#${pedido.id.toString().padStart(4, "0")}`,
      solicitante: "Almoxarife",
    });
    setItens((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, reposicaoSolicitada: true } : p
      )
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-6 left-1/2 z-[60] bg-white p-4 rounded-xl shadow-2xl border border-emerald-200 min-w-[320px]"
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-emerald-700">Solicitação registrada com sucesso!</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 font-medium">
              <p><strong className="text-slate-800">Produto:</strong> {toastMessage.produto}</p>
              <p><strong className="text-slate-800">Código:</strong> {toastMessage.codigo}</p>
              <p><strong className="text-slate-800">Setor:</strong> {toastMessage.setor}</p>
              <p><strong className="text-slate-800">Requisição:</strong> {toastMessage.requisicao}</p>
              <p><strong className="text-slate-800">Solicitante:</strong> {toastMessage.solicitante}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 top-6 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col md:max-w-md md:mx-auto md:top-10 md:rounded-3xl overflow-hidden"
      >
        {/* CABEÇALHO FIXO */}
        <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-4 pt-5 pb-3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-800 text-lg leading-tight">
                Pedido #{pedido.id.toString().padStart(4, "0")}
              </h2>
              <p className="text-xs font-bold text-slate-500">
                {pedido.setor || "Almoxarifado"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Progresso</span>
              <span className="text-indigo-600">
                {concluidosCount} de {totalCount} itens
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${(concluidosCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["PENDENTES", "CONCLUIDOS", "TODOS"].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all ${filtro === f
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {f} (
                {f === "PENDENTES"
                  ? pendentesCount
                  : f === "CONCLUIDOS"
                    ? concluidosCount
                    : totalCount}
                )
              </button>
            ))}
          </div>
        </div>

        {/* ÁREA CENTRAL ROLÁVEL */}
        <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <AnimatePresence>
            {itensFiltrados.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-10 text-slate-400 font-bold text-sm"
              >
                Nenhum item {filtro.toLowerCase()}
              </motion.div>
            )}
            {itensFiltrados.map((item) => {
              const stock = item.item.quantidade;
              const insuficient = stock < item.quantidade;
              const maxQtd = insuficient ? stock : item.quantidade;

              if (item.statusLocal === "CONCLUIDO") {
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 text-emerald-800 flex flex-col px-4 py-3 rounded-xl shrink-0 border border-emerald-100 shadow-sm gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm truncate pr-2 flex-1">
                        {item.item.nome}
                      </span>
                      <span className="font-black font-mono shrink-0 flex items-center gap-1.5 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {item.quantidadeBaixa}
                      </span>
                    </div>
                    {item.reposicaoSolicitada ? (
                      <div className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1.5 rounded-lg border border-amber-300 flex items-center justify-center gap-1.5 opacity-80 cursor-not-allowed">
                        ✉️ Reposição Solicitada
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSolicitarReposicao(item)}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold py-2 px-3 rounded-lg text-sm w-full transition-colors flex items-center justify-center gap-2 mt-2"
                      >
                        🛒 Solicitar Reposição ao Compras
                      </button>
                    )}
                  </motion.div>
                );
              }

              // PENDENTE
              const isScannerOpen = scannerAtivo === item.id;
              const isQrValidado = item.qrValido;
              const obsRequired = insuficient;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex flex-col gap-4 shadow-sm shrink-0"
                >
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight">
                      {item.item.nome}
                    </h3>

                    {/* Endereçamento */}
                    <div className="mt-1.5 flex items-center text-xs font-medium text-slate-500">
                      <span className="text-blue-500 mr-1">📍</span> Prateleira B-04 • Box 12
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-md text-[11px] tracking-wide">
                        QTD: {item.quantidade} UN
                      </span>
                      <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-md text-[11px]">
                        {item.item.codigo}
                      </span>
                    </div>
                  </div>

                  {insuficient && (
                    <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl text-orange-800 text-xs font-bold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-tight">
                        Aviso: Saldo em estoque insuficiente (Disponível: {stock} un)
                      </span>
                    </div>
                  )}

                  {isScannerOpen ? (
                    <div className="flex flex-col items-center bg-slate-900 rounded-xl p-1 pb-3">
                      <div className="w-full aspect-square rounded-lg overflow-hidden relative">
                        <Scanner
                          onScan={(res) => handleScan(res, item)}
                          onError={console.error}
                        />
                        <div className="absolute inset-0 border-[30px] border-black/30 pointer-events-none" />
                        <div className="absolute inset-1/4 border-2 border-dashed border-white/50 rounded-lg animate-pulse" />
                      </div>
                      {scanError && (
                        <p className="text-red-400 font-bold text-[10px] mt-2 text-center px-2">
                          {scanError}
                        </p>
                      )}
                      <button
                        onClick={() => {
                          setScannerAtivo(null);
                          setScanError("");
                        }}
                        className="mt-3 px-4 py-1.5 rounded-full bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : isQrValidado ? (
                    <div className="flex flex-col gap-3 animate-in fade-in bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            Qtd Validada (Máx: {maxQtd})
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={maxQtd}
                            value={item.quantidadeBaixa}
                            onChange={(e) => {
                              let val = parseInt(e.target.value);
                              if (isNaN(val)) val = "";
                              else if (val > maxQtd) val = maxQtd;
                              setItens((prev) =>
                                prev.map((p) =>
                                  p.id === item.id
                                    ? { ...p, quantidadeBaixa: val }
                                    : p
                                )
                              );
                            }}
                            className="w-full border-2 border-slate-200 p-2 rounded-lg font-black font-mono focus:border-indigo-500 outline-none transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                          Observação{" "}
                          {obsRequired && (
                            <span className="text-red-500">(Obrigatório)</span>
                          )}
                        </label>
                        <textarea
                          rows={1}
                          value={item.observacao}
                          onChange={(e) =>
                            setItens((prev) =>
                              prev.map((p) =>
                                p.id === item.id
                                  ? { ...p, observacao: e.target.value }
                                  : p
                              )
                            )
                          }
                          className={`w-full border-2 p-2.5 rounded-lg text-sm outline-none resize-none transition-colors ${obsRequired && !item.observacao.trim()
                              ? "border-red-200 bg-red-50 focus:border-red-400 placeholder:text-red-300"
                              : "border-slate-200 focus:border-indigo-500"
                            }`}
                          placeholder={
                            obsRequired
                              ? "Justifique a entrega parcial..."
                              : "Detalhes (opcional)..."
                          }
                        />
                      </div>
                      <button
                        disabled={
                          !item.quantidadeBaixa ||
                          (obsRequired && !item.observacao.trim())
                        }
                        onClick={() => handleConfirmItem(item.id)}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:bg-slate-300 hover:bg-indigo-700 active:scale-95 transition-all"
                      >
                        Salvar Item
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setScannerAtivo(item.id)}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all mt-1"
                    >
                      <Camera className="w-5 h-5" /> Escanear QR Code
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* RODAPÉ FIXO */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 z-10 p-4">
          <button
            disabled={pendentesCount > 0 || loading}
            onClick={handleFinalizar}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 disabled:bg-slate-400 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <PackageCheck className="w-5 h-5" /> Finalizar Requisição
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}
