const fs = require('fs');
const readline = require('readline');
const path = require('path');

const transcriptPath = 'C:\\Users\\joaov\\.gemini\\antigravity-ide\\brain\\f93dd31e-6d2e-4221-b98d-7d1ed7de114a\\.system_generated\\logs\\transcript.jsonl';
const outputPath = 'C:\\Projetos\\Marcon(certo)\\Desafio-Marcon\\documentacao_uso_ia.md';

async function generateDoc() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let markdown = '# Documentação de Uso de IA - Projeto Marcon\n\n';
  markdown += 'Este documento registra o histórico de interações com a IA, incluindo as datas, prompts enviados e as respostas/ações realizadas.\n\n';

  let currentEntry = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      
      // Capturar mensagens do usuário
      if (data.type === 'USER_INPUT' && data.content) {
        let content = data.content;
        
        // Limpar o conteúdo das tags <ADDITIONAL_METADATA> e outras tags do sistema
        const reqMatch = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
        if (reqMatch) {
            content = reqMatch[1].trim();
        } else if (content.includes('<ADDITIONAL_METADATA>')) {
            content = content.split('<ADDITIONAL_METADATA>')[0].trim();
        }

        const dataLocal = new Date(data.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        
        currentEntry = {
          data: dataLocal,
          prompt: content,
          respostas: []
        };
      }
      
      // Capturar mensagens da IA (MODEL)
      if (data.source === 'MODEL' && data.type === 'PLANNER_RESPONSE' && currentEntry) {
          if (data.content && data.content.trim()) {
            currentEntry.respostas.push(data.content.trim());
          }
      }

      // Se encontrar um novo USER_INPUT, salvar o anterior e iniciar novo
      if (data.type === 'USER_INPUT' && currentEntry && currentEntry.prompt && currentEntry.respostas.length > 0) {
         // wait, logic is slightly flawed. I should push to array.
      }
    } catch(e) {}
  }
}
