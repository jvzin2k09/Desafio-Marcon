import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Necessário para permitir chamadas do Expo Web (CORS) rodando na porta 8081
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" }, 
        { status: 400, headers: corsHeaders }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim() }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" }, 
        { status: 401, headers: corsHeaders }
      );
    }

    let isPasswordValid = false;
    if (user.senha === password) {
      isPasswordValid = true;
    } else {
      try {
        isPasswordValid = await bcrypt.compare(password, user.senha);
      } catch (e) {
        isPasswordValid = false;
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Senha incorreta" }, 
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id.toString(),
        name: user.nome,
        email: user.email,
        role: user.role
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("[MOBILE LOGIN API ERROR]:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor. O banco de dados está ligado?" }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
