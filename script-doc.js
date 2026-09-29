const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\joaov\\.gemini\\antigravity-ide\\brain\\f93dd31e-6d2e-4221-b98d-7d1ed7de114a\\.system_generated\\logs\\transcript.jsonl';
const outputPath = 'C:\\Projetos\\Marcon(certo)\\Desafio-Marcon\\documentacao_uso_ia.md';

async function generateDoc() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let entries = [];
  let currentEntry = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      
      if (data.type === 'USER_INPUT' && data.content) {
        if (currentEntry) entries.push(currentEntry);
        
        let content = data.content;
        const reqMatch = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
        if (reqMatch) {
            content = reqMatch[1].trim();
        } else if (content.includes('<ADDITIONAL_METADATA>')) {
            content = content.split('<ADDITIONAL_METADATA>')[0].trim();
        }

        const dataLocal = new Date(data.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        let finalidade = "Desenvolvimento de Funcionalidade";
        if (content.toLowerCase().includes('erro') || content.toLowerCase().includes('bug') || content.toLowerCase().includes('corrija')) finalidade = "Correção de Bug / Troubleshooting";
        if (content.toLowerCase().includes('documenta') || content.toLowerCase().includes('gere um arquivo')) finalidade = "Documentação";
        
        currentEntry = {
          data: dataLocal,
          prompt: content,
          finalidade: finalidade,
          resposta: ""
        };
      }
      
      if (data.source === 'MODEL' && data.type === 'PLANNER_RESPONSE' && currentEntry) {
          if (data.content && data.content.trim()) {
            currentEntry.resposta += data.content.trim() + '\n\n';
          }
      }
    } catch(e) {}
  }
  
  if (currentEntry) entries.push(currentEntry);

  let markdown = '# Documentação de Uso de IA - Desafio Marcon\n\n';
  markdown += '> Este documento foi gerado automaticamente e regista as interações realizadas com o assistente de IA durante o desenvolvimento do projeto.\n\n';
  markdown += '---\n\n';

  entries.forEach((entry, index) => {
      // Ignorar prompts de checkpoint do sistema truncados ou logs irrelevantes
      if (entry.prompt.includes('CHECKPOINT') || !entry.prompt || entry.prompt.includes('The USER performed the following action:')) return;

      markdown += '## Interação ' + (index + 1) + '\n\n';
      markdown += '**📅 Data/Hora:** ' + entry.data + '\n';
      markdown += '**🎯 Finalidade:** ' + entry.finalidade + '\n\n';
      markdown += '### 👤 Prompt do Utilizador:\n```text\n' + entry.prompt + '\n```\n\n';
      if (entry.resposta) {
          markdown += '### 🤖 Resposta da IA:\n' + entry.resposta + '\n';
      }
      markdown += '\n---\n\n';
  });

  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log('Documentação gerada com sucesso em: ' + outputPath);
}
generateDoc();
