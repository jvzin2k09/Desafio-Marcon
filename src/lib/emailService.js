import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

const DEFAULT_TARGET_EMAIL = process.env.STOCK_ALERT_EMAIL || 'joao.v.coelho14@aluno.senai.br';

/**
 * Cria ou recupera o transporter do Nodemailer.
 * Suporta SMTP configurado em variáveis de ambiente (.env) ou cria conta Ethereal para testes.
 */
async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Fallback para desenvolvimento: Tenta criar conta de teste Ethereal
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  } catch (err) {
    // Se estiver sem conexão externa, usa transporte JSON mock para não falhar
    console.warn('[EMAIL SERVICE] Não foi possível conectar ao Ethereal. Usando transporte de log local.');
    return {
      sendMail: async (options) => {
        console.log('[EMAIL MOCK DISPARADO]:', {
          to: options.to,
          subject: options.subject,
          from: options.from,
        });
        return { messageId: `mock-${Date.now()}`, testMessageUrl: null };
      }
    };
  }
}

/**
 * Gera o template HTML Dark Industrial da Marcon Metalúrgica
 */
export function buildStockAlertHtml({
  codigo,
  nome,
  setor,
  localizacao,
  quantidadeAtual,
  limiteMinimo,
  unidade = 'UN',
  painelUrl,
}) {
  const isEsgotado = quantidadeAtual <= 0;
  const statusColor = isEsgotado ? '#EF4444' : '#F59E0B';
  const statusBg = isEsgotado ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const statusBorder = isEsgotado ? '#EF4444' : '#F59E0B';
  const statusLabel = isEsgotado ? 'CRÍTICO: ESGOTADO' : 'ALERTA: ESTOQUE BAIXO';
  const ctaUrl = painelUrl || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/painel-estoque`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Reposição Crítica - MARCON</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0B1120; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Container Principal Dark Industrial -->
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #0F172A; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner com Fundo Branco, Logo Ampliada e Tipografia Azul Marcon -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 22px 28px; border-bottom: 3px solid #2563EB;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="170" style="vertical-align: middle;">
                    <img src="cid:marconlogo" alt="Marcon" style="height: 52px; width: auto; max-width: 160px; display: block; border: 0;" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 20px; border-left: 2px solid #E2E8F0;">
                    <div style="font-size: 21px; font-weight: 900; letter-spacing: 1.2px; color: #0A326E; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      MARCON METALÚRGICA
                    </div>
                    <div style="font-size: 11px; font-weight: 700; color: #1D4ED8; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;">
                      Gestão de Estoque & Almoxarifado Inteligente
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Faixa de Alerta / Status -->
          <tr>
            <td style="padding: 28px 32px 12px 32px;">
              <div style="display: inline-block; background-color: ${statusBg}; border: 1px solid ${statusBorder}; color: ${statusColor}; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 14px; border-radius: 9999px; margin-bottom: 16px;">
                ${statusLabel}
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #F8FAFC; letter-spacing: -0.5px;">
                ⚠️ ALERTA DE REPOSIÇÃO CRÍTICA
              </h1>
              <p style="margin: 12px 0 0 0; font-size: 14px; line-height: 22px; color: #94A3B8;">
                O sistema de monitoramento identificou que um item essencial de produção atingiu o nível mínimo de segurança. É necessária <strong style="color: #F1F5F9;">ação imediata de compra ou remanejamento</strong> para evitar interrupções na linha fabril.
              </p>
            </td>
          </tr>

          <!-- Tabela de Detalhes do Item -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #111827; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; border-collapse: separate;">
                <tr>
                  <th colspan="2" style="background-color: #1E293B; color: #38BDF8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 12px 16px; text-align: left; border-bottom: 1px solid #334155;">
                    Dados do Material Industrial
                  </th>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; border-bottom: 1px solid #1E293B; width: 38%;">
                    Código do Item:
                  </td>
                  <td style="padding: 12px 16px; color: #F1F5F9; font-size: 13px; font-weight: 800; font-family: 'Courier New', Courier, monospace; border-bottom: 1px solid #1E293B;">
                    #${codigo}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; border-bottom: 1px solid #1E293B;">
                    Descrição / Material:
                  </td>
                  <td style="padding: 12px 16px; color: #FFFFFF; font-size: 13px; font-weight: 700; border-bottom: 1px solid #1E293B;">
                    ${nome}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; border-bottom: 1px solid #1E293B;">
                    Setor / Localização:
                  </td>
                  <td style="padding: 12px 16px; color: #CBD5E1; font-size: 13px; font-weight: 600; border-bottom: 1px solid #1E293B;">
                    ${setor || 'Geral'} <span style="color: #64748B;">|</span> Galpão ${localizacao || 'Almoxarifado Central'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; border-bottom: 1px solid #1E293B;">
                    Estoque Atual:
                  </td>
                  <td style="padding: 12px 16px; color: ${statusColor}; font-size: 16px; font-weight: 900; font-family: 'Courier New', Courier, monospace; border-bottom: 1px solid #1E293B;">
                    ${quantidadeAtual} ${unidade} ${isEsgotado ? '(ESGOTADO)' : '(ABAIXO DO MÍNIMO)'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600;">
                    Limite Mínimo de Segurança:
                  </td>
                  <td style="padding: 12px 16px; color: #94A3B8; font-size: 13px; font-weight: 700; font-family: 'Courier New', Courier, monospace;">
                    ${limiteMinimo} ${unidade}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Chamada para Ação (CTA) -->
          <tr>
            <td style="padding: 16px 32px 32px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 13px; font-weight: 800; color: #FFFFFF; text-decoration: none; text-transform: uppercase; letter-spacing: 0.8px; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      Acessar Painel de Controle de Estoque &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 16px; font-size: 11px; color: #64748B;">
                Acesso restrito à equipe autorizada de Compras, Almoxarifado e PCP Marcon.
              </div>
            </td>
          </tr>

          <!-- Rodapé Dark Industrial -->
          <tr>
            <td style="background-color: #090E17; padding: 20px 32px; border-top: 1px solid #1E293B; text-align: center;">
              <p style="margin: 0; font-size: 11px; line-height: 18px; color: #64748B;">
                Mensagem automática gerada pelo <strong>Almoxarifado Marcon Metalúrgica</strong>. Não responda a este e-mail.
              </p>
              <p style="margin: 6px 0 0 0; font-size: 10px; color: #475569;">
                Til Marcon Equipamentos Industriais &bull; Módulo de Suprimentos & Almoxarifado 4.0
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispara e-mail de alerta de estoque para o destinatário informado ou padrão.
 */
export async function sendStockAlertEmail({
  item,
  quantidadeAtual,
  limiteMinimo,
  setor,
  localizacao,
  destinatario = DEFAULT_TARGET_EMAIL,
  painelUrl,
}) {
  try {
    const transporter = await getTransporter();

    const codigo = item?.codigo || 'TM-000';
    const nome = item?.nome || 'Material Industrial';
    const finalSetor = setor || item?.setor || 'Geral';
    const finalLoc = localizacao || item?.localizacao || 'Almoxarifado Central';
    const finalQtd = quantidadeAtual !== undefined ? quantidadeAtual : (item?.quantidade ?? 0);
    const finalMin = limiteMinimo !== undefined ? limiteMinimo : (item?.limiteMinimo ?? 10);
    const unidade = item?.unidade || 'UN';

    const subject = finalQtd === 0
      ? `🚨 [MARCON] ESTOQUE ZERADO: ${codigo} - ${nome}`
      : `⚠️ [MARCON] ALERTA DE REPOSIÇÃO: ${codigo} - ${nome} (${finalQtd}/${finalMin} ${unidade})`;

    const html = buildStockAlertHtml({
      codigo,
      nome,
      setor: finalSetor,
      localizacao: finalLoc,
      quantidadeAtual: finalQtd,
      limiteMinimo: finalMin,
      unidade,
      painelUrl,
    });

    const logoPath = path.join(process.cwd(), 'public', 'Logo.png');
    const attachments = [];
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: 'logo-marcon.png',
        path: logoPath,
        cid: 'marconlogo',
      });
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Almoxarifado Marcon" <estoque@tilmarcon.com.br>',
      to: destinatario,
      subject,
      html,
      attachments,
    });

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }

    console.log(`[EMAIL ENVIADO] Alerta de reposição enviado para ${destinatario} | MsgID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[EMAIL PREVIEW] Visualizar em: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      destinatario,
      subject,
    };
  } catch (error) {
    console.error('[EMAIL ERRO] Falha ao enviar alerta de estoque:', error);
    return {
      success: false,
      error: error.message || 'Erro no envio de e-mail',
      destinatario,
    };
  }
}

/**
 * Gatilho de monitoramento: se o saldo estiver <= limite mínimo, dispara o e-mail em background.
 */
export async function checkAndTriggerStockAlert(itemDb, novaQuantidade, setor) {
  if (!itemDb) return;

  const limiteMinimo = itemDb.limiteMinimo ?? 10;
  if (novaQuantidade <= limiteMinimo) {
    // Executa sem travar o endpoint HTTP principal
    setImmediate(async () => {
      try {
        await sendStockAlertEmail({
          item: itemDb,
          quantidadeAtual: novaQuantidade,
          limiteMinimo,
          setor: setor || itemDb.setor,
          localizacao: itemDb.localizacao,
        });
      } catch (err) {
        console.error('[STOCK MONITOR] Erro no disparo de alerta em background:', err);
      }
    });
  }
}
