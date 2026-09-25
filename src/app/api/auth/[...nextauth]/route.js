import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log("=== [AUTH] Tentativa de login ===");
          console.log("[AUTH] Email recebido:", credentials?.email);

          if (!credentials?.email || !credentials?.senha) {
            console.log("[AUTH] Erro: campos email ou senha vazios");
            throw new Error("Email e senha são obrigatórios");
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            console.log("[AUTH] Erro: usuário não encontrado no banco para email:", credentials.email);
            throw new Error("Usuário não encontrado");
          }

          console.log("[AUTH] Usuário encontrado:", { id: user.id, nome: user.nome, email: user.email, role: user.role });
          console.log("[AUTH] Senha no banco (primeiros 10 chars):", user.senha ? user.senha.substring(0, 10) : "");
          console.log("[AUTH] Senha é hash bcrypt?", user.senha ? (user.senha.startsWith("$2a$") || user.senha.startsWith("$2b$")) : false);

          let isPasswordValid = false;
          if (user.senha === credentials.senha) {
            isPasswordValid = true;
          } else {
            try {
              isPasswordValid = await bcrypt.compare(credentials.senha, user.senha);
            } catch (e) {
              isPasswordValid = false;
            }
          }

          console.log("[AUTH] Resultado validação de senha:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("[AUTH] Erro: senha incorreta para usuário:", user.email);
            throw new Error("Senha incorreta");
          }

          console.log("[AUTH] Login com sucesso! Role:", user.role, "| hasPin:", !!user.pin);

          return {
            id: user.id.toString(),
            name: user.nome,
            email: user.email,
            role: user.role,
            hasPin: !!user.pin
          };
        } catch (error) {
          console.log("[AUTH] Erro auth:", error.message);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.hasPin = user.hasPin;
      }
      if (trigger === "update" && session?.hasPin !== undefined) {
        token.hasPin = session.hasPin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.hasPin = token.hasPin;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
