const LOCAL_URL = 'http://localhost:8080/v1/chat/completions';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reviewText') {
    handleReviewRequest(request, sendResponse);
    return true;
  }
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
});

async function handleReviewRequest({ text, mode }, sendResponse) {
  try {
    const { system, prompt, temperature } = buildPrompt(mode, text);
    const response = await fetch(LOCAL_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:       'local',
        messages:    [
          { role: 'system', content: system },
          { role: 'user',   content: prompt }
        ],
        temperature,
        max_tokens:  4096,
        stream:      false
      })
    });

    if (!response.ok) {
      sendResponse({ error: 'Servidor local não está respondendo. Verifique se o DigIAna está em execução.' });
      return;
    }

    const data   = await response.json();
    const raw    = data?.choices?.[0]?.message?.content ?? '';
    const result = postProcess(raw);

    if (result) {
      sendResponse({ result });
    } else {
      sendResponse({ error: 'O modelo retornou uma resposta vazia.' });
    }
  } catch {
    sendResponse({ error: 'Servidor local não encontrado. Reinicie o computador ou execute DigIAna manualmente.' });
  }
}

// ─── Pós-processamento da resposta bruta do modelo ───────────────────────────

function postProcess(text) {
  let result = stripThinking(text);
  result = stripPreamble(result);
  return result;
}

// Remove blocos <think>...</think> gerados pelo modelo de raciocínio.
// Se </think> nunca fechar (contexto esgotado), remove tudo a partir de <think>.
function stripThinking(text) {
  let result = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  result = result.replace(/<think>[\s\S]*/gi, '');
  return result.trim();
}

// Remove linhas de preamble que modelos pequenos inserem antes da resposta,
// por exemplo: "Aqui está o texto reescrito:", "Texto melhorado:", etc.
function stripPreamble(text) {
  const lines = text.split('\n');
  // Remove linhas iniciais que são meta-comentários (terminam em ':' e são curtas)
  while (lines.length > 1) {
    const first = lines[0].trim();
    // Linha vazia, ou linha curta terminando em ':' = preamble
    if (first === '' || (first.length <= 100 && first.endsWith(':'))) {
      lines.shift();
    } else {
      break;
    }
  }
  return lines.join('\n').trim();
}

// ─── Prompts por modo ────────────────────────────────────────────────────────

function buildPrompt(mode, text) {
  const system = 'Você é a DigIAna, uma assistente de escrita experiente e mestre em comunicação que corrige erros ortográficos e pontuacionais em textos escritos em PT-BR. Responda apenas com o texto final revisado, sem introduções ou explicações.';

  if (mode === 'resumir') {
    return {
      system,
      prompt:      `Resuma o texto abaixo de forma clara, direta e executiva. O objetivo é uma leitura rápida no WhatsApp.\n\nTEXTO:\n${text}\n\nRESUMO:`,
      temperature: 0.3
    };
  }

  // modo 'melhorar'
  return {
    system,
    prompt:      `Aja como um redator profissional. Analise o texto abaixo e reescreva-o corrigindo gramática, pontuação e ortografia. Eleve o tom para um nível profissional e polido, mas mantenha a naturalidade para o WhatsApp. Remova gírias desnecessárias e melhore a fluidez.\n\nTEXTO:\n${text}\n\nTEXTO REVISADO:`,
    temperature: 0.5
  };
}
