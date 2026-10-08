const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Carrega variáveis do .env se existir
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          const val = vals.join('=').trim();
          process.env[key.trim()] = val.replace(/^["']|["']$/g, '');
        }
      }
    });
  }
} catch (e) {}

const DESTINATARIO = process.env.STOCK_ALERT_EMAIL || 'joao.v.coelho14@aluno.senai.br';

function buildStockAlertHtml({
  codigo,
  nome,
  setor,
  localizacao,
  quantidadeAtual,
  limiteMinimo,
  unidade,
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
  <title>Alerta de Reposição Crítica - MARCON</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0B1120; padding: 32px 16px;">
    <tr>
      <td align="center">
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
                O sistema de monitoramento identificou que um item essencial de produção atingiu o nível mínimo de segurança. É necessária <strong style="color: #F1F5F9;">ação imediata de compra ou reposição</strong> para evitar paradas na linha de produção.
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
                    ${setor || 'Usinagem'} <span style="color: #64748B;">|</span> Galpão ${localizacao || 'B-02-01'}
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

          <!-- CTA -->
          <tr>
            <td style="padding: 16px 32px 32px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 13px; font-weight: 800; color: #FFFFFF; text-decoration: none; text-transform: uppercase; letter-spacing: 0.8px; border-radius: 10px;">
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

          <!-- Rodapé -->
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

async function run() {
  console.log('====================================================');
  console.log('  TESTE DE DISPARO DE E-MAIL - MARCON METALÚRGICA   ');
  console.log('====================================================');
  console.log(`Destinatário Alvo: ${DESTINATARIO}`);

  const itemTeste = {
    codigo: 'TM-004',
    nome: 'Chapa de Aço Carbono 2mm 1x2m',
    setor: 'Usinagem',
    localizacao: 'B-02-01',
    quantidadeAtual: 3,
    limiteMinimo: 10,
    unidade: 'UN'
  };

  let transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    console.log(`Conectando ao SMTP configurado: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}...`);
    transporter = nodemailer.createTransport({
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
  } else {
    console.log('Nenhum SMTP personalizado no .env. Gerando conta de teste segura Ethereal...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
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
    } catch (e) {
      console.log('Aviso: Ethereal indisponível na rede atual. Simulando envio local em modo demonstrativo...');
      transporter = {
        sendMail: async (opts) => {
          return { messageId: `marcon-local-${Date.now()}` };
        }
      };
    }
  }

  const html = buildStockAlertHtml(itemTeste);

  const logoPath = path.join(__dirname, 'public', 'Logo.png');
  const attachments = [];
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo-marcon.png',
      path: logoPath,
      cid: 'marconlogo',
    });
  }

  console.log('Enviando e-mail temático com Logotipo Oficial da Marcon...');
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Almoxarifado Marcon" <estoque@tilmarcon.com.br>',
    to: DESTINATARIO,
    subject: `⚠️ [MARCON] ALERTA DE REPOSIÇÃO: ${itemTeste.codigo} - ${itemTeste.nome} (${itemTeste.quantidadeAtual}/${itemTeste.limiteMinimo} ${itemTeste.unidade})`,
    html,
    attachments,
  });

  console.log('\n✅ E-MAIL DISPARADO COM SUCESSO!');
  console.log(`Message ID: ${info.messageId}`);
  console.log(`Destinatário: ${DESTINATARIO}`);

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log(`\n🔗 Link de Visualização Online (Ethereal):`);
    console.log(`   ${preview}`);
  }
  console.log('====================================================\n');
}

run().catch(err => {
  console.error('❌ Erro ao enviar e-mail:', err);
  process.exit(1);
});
