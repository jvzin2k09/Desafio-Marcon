"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const getHomeRoute = (role) => {
    if (role === "ADMIN") return "/painel-estoque";
    if (role === "ALMOXARIFE") return "/almoxarifado";
    return "/solicitante";
  };

  const handleBack = () => {
    const route = getHomeRoute(session?.user?.role);
    router.push(route);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="site-card w-full max-w-md p-10 flex flex-col items-center text-center gap-6"
      >
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "var(--surface-3)" }}
        >
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>

        {/* Copy */}
        <div>
          <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight mb-2">
            Acesso Negado
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
            Você não possui permissão para acessar esta página. Entre em contato
            com o administrador caso precise de acesso.
          </p>
        </div>

        {/* Role badge */}
        {session?.user?.role && (
          <div
            className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest"
            style={{ background: "var(--surface-2)", color: "var(--primary)" }}
          >
            Seu perfil: {session.user.role}
          </div>
        )}

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBack}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-black text-sm tracking-widest uppercase transition-all"
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
            boxShadow: "0 4px 16px rgba(27,58,107,0.25)",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Início
        </motion.button>
      </motion.div>
    </div>
  );
}
