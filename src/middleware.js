import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const role = token.role;

    // ADMIN: acesso irrestrito a todos os módulos
    if (role === "ADMIN") {
      return NextResponse.next();
    }

    // ALMOXARIFE: acesso exclusivo à fila de atendimento e histórico
    if (role === "ALMOXARIFE") {
      if (
        path.startsWith("/almoxarifado") ||
        path.startsWith("/historico")
      ) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // OPERADOR: acesso exclusivo ao painel de requisições
    if (role === "OPERADOR") {
      if (path.startsWith("/solicitante")) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Qualquer outro role desconhecido
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/almoxarifado/:path*",
    "/solicitante/:path*",
    "/historico/:path*",
  ],
};
