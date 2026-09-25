import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Acesso de Admin
    if (path.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Acesso de Almoxarife
    if (path.startsWith("/almoxarifado") && token.role !== "ALMOXARIFE") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Acesso de Operador
    if (path.startsWith("/solicitante") && token.role !== "OPERADOR") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Histórico (Admin e Almoxarife)
    if (path.startsWith("/historico") && !["ADMIN", "ALMOXARIFE"].includes(token.role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/almoxarifado/:path*", "/solicitante/:path*", "/historico/:path*"],
};
