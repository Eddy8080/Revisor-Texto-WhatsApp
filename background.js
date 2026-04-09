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
      sendResponse({ error: 'Servidor local não está respondendo. Verifique se o RevisorTexto está em execução.' });
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
  const system = 'Você é um assistente de comunicação PT-BR. Responda SOMENTE com o texto solicitado, sem explicações, sem comentários, sem introduções.';

  if (mode === 'resumir') {
    return {
      system,
      prompt:      `Resuma o texto abaixo em uma mensagem curta, clara e direta, pronta para ser enviada. Preserve o sentido principal. Escreva somente o resumo.\n\nTEXTO:\n${text}\n\nRESUMO:`,
      temperature: 0.2
    };
  }

  // modo 'melhorar'
  return {
    system,
    prompt:      `Reescreva a mensagem abaixo em português correto e PROFISSIONAL, mantendo o sentido original. Corrija gírias, erros ORTIGRÁFICOS e  GRAMATICAIS. Escreva somente a mensagem reescrita.\n\nTEXTO:\n${text}\n\nTEXTO REESCRITO:`,
    temperature: 0.4
  };
}
