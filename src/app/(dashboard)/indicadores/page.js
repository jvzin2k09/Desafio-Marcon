"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend as RechartsLegend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import { TrendingUp, TrendingDown, Package, Recycle, Calendar } from "lucide-react";
import { getDashboardData } from "@/app/actions/indicadores";

// Usinagem (Azul), Logística (Verde), Manutenção (Vermelho), Montagem (Amarelo)
const pieColors = ['#3b82f6', '#22c55e', '#ef4444', '#eab308'];
const barColors = { sobras: '#38bdf8', atendimento: '#2563eb', devolucoes: '#34d399', pendente: '#a855f7' };

// Mock Data for Sparkline - keeping visual effect only
const sparklineData = [
  { value: 10 }, { value: 15 }, { value: 20 }, { value: 25 }, { value: 22 }, { value: 30 }, { value: 35 }
];

export default function IndicadoresPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState({
    kpi: { totalReqCurrentMonth: 0, percentReq: 0, taxaReusoLean: 0 },
    barData: [],
    pieData: [],
    totalSetores: 0
  });

  useEffect(() => {
    setMounted(true);
    if (window.innerWidth < 1024) {
      router.push("/");
    }
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        router.push("/");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [router]);

  useEffect(() => {
    if (mounted && window.innerWidth >= 1024) {
      setLoading(true);
      getDashboardData(anoSelecionado).then((res) => {
        setData(res);
        setLoading(false);
      });
    }
  }, [anoSelecionado, mounted]);

  if (!mounted) return null;
  if (typeof window !== "undefined" && window.innerWidth < 1024) return null;

  const CustomTooltipBar = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white lg:bg-slate-900/90 p-3 border border-slate-200 lg:border-slate-700 rounded-lg shadow-lg">
          <p className="font-bold text-slate-800 lg:text-white lg:text-slate-100 mb-2">{label}</p>
          {payload.slice().reverse().map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="text-slate-600 lg:text-slate-300 font-medium">
                {entry.name === 'sobras' ? 'Sobras Usadas' :
                 entry.name === 'atendimento' ? 'Atendimento Central' :
                 entry.name === 'devolucoes' ? 'Devoluções de Processo' : 'Pendente Compras'}:
              </span>
              <span className="text-slate-800 lg:text-white font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipPie = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white lg:bg-slate-900/90 p-2 border border-slate-200 lg:border-slate-700 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 lg:text-slate-300 font-medium">{payload[0].name}:</span>
            <span className="text-slate-800 lg:text-white font-bold">{payload[0].value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 lg:text-white">Indicadores & Gráficos</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500 lg:text-slate-400 font-medium animate-pulse">Carregando indicadores...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white lg:bg-slate-900/80 lg:backdrop-blur-md rounded-xl p-6 border lg:border-slate-800/80 shadow-sm lg:shadow-xl relative overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <p className="text-sm font-medium text-slate-500 lg:text-slate-400 mb-1">Total de Requisições do Mês</p>
                  <h2 className="text-3xl font-bold text-slate-800 lg:text-white">{data.kpi.totalReqCurrentMonth} UN</h2>
                  <div className={`flex items-center gap-1 mt-2 text-sm font-medium w-fit px-2 py-0.5 rounded ${Number(data.kpi.percentReq) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {Number(data.kpi.percentReq) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{Number(data.kpi.percentReq) > 0 ? '+' : ''}{data.kpi.percentReq}% {Number(data.kpi.percentReq) >= 0 ? 'de crescimento' : 'de queda'}</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 lg:bg-blue-500/10 flex items-center justify-center text-blue-600 lg:text-blue-400">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-24 opacity-30 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white lg:bg-slate-900/80 lg:backdrop-blur-md rounded-xl p-6 border lg:border-slate-800/80 shadow-sm lg:shadow-xl" style={{ borderColor: "var(--border)" }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500 lg:text-slate-400 mb-1">Taxa de Reuso Lean (Sobras)</p>
                  <h2 className="text-3xl font-bold text-emerald-600 lg:text-emerald-400">{data.kpi.taxaReusoLean}%</h2>
                  <p className="text-sm text-slate-500 lg:text-slate-400 mt-2">Destaque para economia de material</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-50 lg:bg-emerald-500/10 flex items-center justify-center text-emerald-600 lg:text-emerald-400">
                  <Recycle className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white lg:bg-slate-900/80 lg:backdrop-blur-md rounded-xl border lg:border-slate-800/80 shadow-sm lg:shadow-xl lg:col-span-2 flex flex-col" style={{ borderColor: "var(--border)" }}>
              <div className="p-6 border-b lg:border-slate-700/50 flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-lg font-bold text-slate-800 lg:text-white">Movimentação Mensal (Overview)</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 lg:text-slate-400 lg:text-slate-300 border lg:border-slate-700/50 px-3 py-1.5 rounded-lg bg-white lg:bg-slate-800/50" style={{ borderColor: "var(--border)" }}>
                  <Calendar className="w-4 h-4" />
                  <select 
                    className="bg-transparent outline-none cursor-pointer font-medium text-slate-600 lg:text-slate-300"
                    value={anoSelecionado}
                    onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                  >
                    {[2023, 2024, 2025, 2026].map(ano => (
                      <option key={ano} value={ano} className="lg:bg-slate-800">{ano}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-6 flex-1 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="lg:opacity-10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: window.innerWidth >= 1024 ? '#94a3b8' : '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: window.innerWidth >= 1024 ? '#94a3b8' : '#64748b' }} dx={-10} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} content={<CustomTooltipBar />} />
                    <RechartsLegend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      payload={[
                        { value: 'Atendimento', type: 'circle', color: barColors.atendimento, id: 'atendimento' },
                        { value: 'Devoluções', type: 'circle', color: barColors.devolucoes, id: 'devolucoes' },
                        { value: 'Pendente', type: 'circle', color: barColors.pendente, id: 'pendente' },
                        { value: 'Sobras', type: 'circle', color: barColors.sobras, id: 'sobras' }
                      ]}
                      formatter={(value) => <span className="text-slate-600 lg:text-slate-300 lg:text-slate-400 font-medium ml-1">{value}</span>}
                    />
                    <Bar dataKey="sobras" name="Sobras" stackId="a" fill={barColors.sobras} radius={[0, 0, 4, 4]} />
                    <Bar dataKey="atendimento" name="Atendimento" stackId="a" fill={barColors.atendimento} />
                    <Bar dataKey="devolucoes" name="Devoluções" stackId="a" fill={barColors.devolucoes} />
                    <Bar dataKey="pendente" name="Pendente" stackId="a" fill={barColors.pendente} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white lg:bg-slate-900/80 lg:backdrop-blur-md rounded-xl border lg:border-slate-800/80 shadow-sm lg:shadow-xl flex flex-col" style={{ borderColor: "var(--border)" }}>
              <div className="p-6 border-b lg:border-slate-700/50" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-lg font-bold text-slate-800 lg:text-white">Distribuição por Setor</h3>
              </div>
              <div className="p-6 flex-1 flex flex-col w-full">
                <div className="relative flex-1 w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        className="cursor-pointer"
                      >
                        {data.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} className="hover:opacity-80 transition-opacity duration-200" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltipPie />} cursor={{ fill: 'transparent' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-sm font-medium text-slate-500 lg:text-slate-400">Total</p>
                    <p className="text-2xl font-bold text-slate-800 lg:text-white">{data.totalSetores}</p>
                  </div>
                </div>

                <div className="mt-6 w-full space-y-3">
                  {data.pieData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pieColors[index % pieColors.length] }}></span>
                        <span className="text-slate-600 lg:text-slate-300 font-medium">{item.name}</span>
                      </div>
                      <span className="text-slate-800 lg:text-white font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
