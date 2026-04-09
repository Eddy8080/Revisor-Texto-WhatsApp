(() => {
  'use strict';

  // Evita injeção dupla
  if (document.getElementById('rte-btn')) return;

  // ─── Estado ────────────────────────────────────────────────────────────────
  let lastFocusedField  = null;
  let isDragging        = false;
  let dragOffsetX       = 0;
  let dragOffsetY       = 0;
  let lastReviewRequest = null; // { text, mode } — usado pelo botão Refazer

  // ─── Rastreia o último campo de texto focado ────────────────────────────────
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    // Ignora elementos do próprio painel para não sobrescrever o campo do WhatsApp
    if (el.closest('#rte-panel') || el.id === 'rte-btn') return;
    const tag = el.tagName;
    if (
      tag === 'TEXTAREA' ||
      (tag === 'INPUT' && ['text', 'search', 'email', 'url'].includes(el.type)) ||
      el.isContentEditable
    ) {
      lastFocusedField = el;
    }
  }, true);

  // ─── Botão flutuante ────────────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'rte-btn';
  btn.title = 'Revisor de Texto';
  btn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>`;
  document.body.appendChild(btn);

  // Posição inicial: canto inferior direito
  btn.style.right  = '24px';
  btn.style.bottom = '80px';

  // ─── Arrastar ───────────────────────────────────────────────────────────────
  btn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging  = true;
    const rect  = btn.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    btn.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;
    btn.style.left   = `${Math.max(0, x)}px`;
    btn.style.top    = `${Math.max(0, y)}px`;
    btn.style.right  = 'auto';
    btn.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    btn.style.transition = '';
  });

  // ─── Painel de revisão ──────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'rte-panel';
  panel.innerHTML = `
    <div id="rte-panel-header">
      <span>Revisor de Texto</span>
      <button id="rte-close" title="Fechar">&#x2715;</button>
    </div>
    <div id="rte-modes">
      <button class="rte-mode" data-mode="melhorar">Melhorar</button>
      <button class="rte-mode" data-mode="resumir">Resumir</button>
    </div>
    <div id="rte-loading" style="display:none">
      <div class="rte-spinner"></div>
      <span>Processando...</span>
    </div>
    <div id="rte-result-area" style="display:none">
      <div id="rte-toolbar">
        <button class="rte-fmt" data-wrap="*"  title="Negrito">B</button>
        <button class="rte-fmt" data-wrap="_"  title="Itálico">I</button>
        <button class="rte-fmt" data-wrap="~"  title="Tachado">S</button>
        <button class="rte-fmt" data-wrap="\`\`\`" title="Monoespaçado">&lt;/&gt;</button>
      </div>
      <textarea id="rte-result" rows="5" spellcheck="false"></textarea>
      <div id="rte-actions">
        <button id="rte-cancel">Cancelar</button>
        <button id="rte-retry" title="Gerar novo resultado">↺</button>
        <button id="rte-apply">Aplicar</button>
      </div>
    </div>
    <div id="rte-error" style="display:none">
      <span id="rte-error-msg"></span>
      <a id="rte-error-link" href="#" style="display:none">Configurar agora</a>
    </div>
  `;
  document.body.appendChild(panel);

  // ─── Abrir/fechar painel ─────────────────────────────────────────────────────
  let clickMoved = false;

  btn.addEventListener('mousedown', () => { clickMoved = false; });
  document.addEventListener('mousemove', () => { if (isDragging) clickMoved = true; });

  btn.addEventListener('click', (e) => {
    if (clickMoved) return; // foi drag, não clique
    e.stopPropagation();
    positionPanel();
    panel.classList.toggle('rte-visible');
    resetPanel();
  });

  document.getElementById('rte-close').addEventListener('click', closePanel);

  // Fecha ao clicar fora
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== btn) closePanel();
  });

  function positionPanel() {
    const btnRect    = btn.getBoundingClientRect();
    const panelH     = 220; // altura estimada antes de renderizar
    const panelW     = 280;
    const margin     = 8;
    const vw         = window.innerWidth;
    const vh         = window.innerHeight;

    // Tenta abrir acima do botão
    let top  = btnRect.top - panelH - margin;
    let left = btnRect.right - panelW;

    // Se sair pelo topo, abre abaixo
    if (top < margin) top = btnRect.bottom + margin;

    // Garante que não sai pela direita nem pela esquerda
    if (left + panelW > vw - margin) left = vw - panelW - margin;
    if (left < margin)               left = margin;

    // Garante que não sai por baixo
    if (top + panelH > vh - margin)  top  = vh - panelH - margin;
    if (top < margin)                top  = margin;

    panel.style.top  = `${top}px`;
    panel.style.left = `${left}px`;
  }

  function closePanel() {
    panel.classList.remove('rte-visible');
    resetPanel();
  }

  function resetPanel() {
    document.getElementById('rte-modes').style.display      = 'grid';
    document.getElementById('rte-loading').style.display    = 'none';
    document.getElementById('rte-result-area').style.display = 'none';
    document.getElementById('rte-error').style.display      = 'none';
  }

  // ─── Selecionar modo e processar ─────────────────────────────────────────────
  document.querySelectorAll('.rte-mode').forEach(modeBtn => {
    modeBtn.addEventListener('click', () => {
      // Usa o campo salvo antes de abrir o painel (já capturado pelo focusin)
      const field = resolveField();
      const text  = field ? getFieldText(field) : '';

      if (!text.trim()) {
        showError('Nenhum texto encontrado. Clique em um campo de texto e tente novamente.');
        return;
      }

      lastReviewRequest = { text, mode: modeBtn.dataset.mode };
      callReview(lastReviewRequest);
    });
  });

  function callReview({ text, mode }) {
    document.getElementById('rte-modes').style.display       = 'none';
    document.getElementById('rte-result-area').style.display = 'none';
    document.getElementById('rte-loading').style.display     = 'flex';

    try {
      chrome.runtime.sendMessage(
        { action: 'reviewText', text, mode },
        (response) => {
          document.getElementById('rte-loading').style.display = 'none';

          if (chrome.runtime.lastError) {
            showError('Extensão recarregada. Atualize a página (F5) e tente novamente.');
            return;
          }

          if (response?.error) {
            showError(response.error);
            return;
          }

          document.getElementById('rte-result').value             = response.result;
          document.getElementById('rte-result-area').style.display = 'flex';
        }
      );
    } catch (e) {
      document.getElementById('rte-loading').style.display = 'none';
      showError('Extensão recarregada. Atualize a página (F5) e tente novamente.');
    }
  }

  // ─── Toolbar de formatação ────────────────────────────────────────────────────
  document.querySelectorAll('.rte-fmt').forEach(fmtBtn => {
    fmtBtn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // evita que a textarea perca o foco/seleção
      const ta    = document.getElementById('rte-result');
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const wrap  = fmtBtn.dataset.wrap;
      const sel   = ta.value.substring(start, end);
      ta.value    = ta.value.substring(0, start) + wrap + sel + wrap + ta.value.substring(end);
      ta.setSelectionRange(start + wrap.length, end + wrap.length);
      ta.focus();
    });
  });

  // ─── Botão Refazer ────────────────────────────────────────────────────────────
  document.getElementById('rte-retry').addEventListener('click', () => {
    if (lastReviewRequest) callReview(lastReviewRequest);
  });

  // ─── Aplicar resultado ───────────────────────────────────────────────────────
  document.getElementById('rte-apply').addEventListener('click', () => {
    const newText = document.getElementById('rte-result').value;
    const field   = resolveField();
    closePanel();
    if (field) {
      setFieldText(field, newText);
    }
  });

  document.getElementById('rte-cancel').addEventListener('click', () => {
    resetPanel();
  });

  // ─── Helpers: ler e escrever texto no campo ──────────────────────────────────
  function getFieldText(el) {
    if (el.isContentEditable) {
      // Coleta apenas text nodes reais, ignorando elementos de placeholder
      // (que geralmente têm data-placeholder ou aria-label e não têm filhos de texto)
      const clone = el.cloneNode(true);
      clone.querySelectorAll('[data-placeholder]').forEach(n => n.remove());
      return (clone.innerText || clone.textContent || '').trim();
    }
    return el.value;
  }

  function resolveField() {
    // Se o campo salvo ainda existe no DOM, usa ele
    if (lastFocusedField && document.contains(lastFocusedField)) {
      return lastFocusedField;
    }
    // Fallbacks em ordem de confiabilidade
    return (
      document.querySelector('div[data-lexical-editor="true"]')                    ||
      document.querySelector('div[data-testid="conversation-compose-box-input"]') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]')        ||
      document.querySelector('div[contenteditable="true"][data-tab="10"]')         ||
      document.querySelector('div[contenteditable="true"]')
    );
  }

  function setFieldText(el, text) {
    if (el.isContentEditable) {
      el.focus();

      // O Lexical mantém seleção interna própria — range.selectNodeContents()
      // só atualiza o DOM, não o estado do Lexical. Para que o paste substitua
      // o conteúdo existente, precisamos que o Lexical processe o Ctrl+A e
      // atualize sua própria seleção antes de receber o paste.
      el.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a', code: 'KeyA', ctrlKey: true,
        bubbles: true, cancelable: true
      }));

      setTimeout(() => {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        el.dispatchEvent(new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        }));
      }, 50);
    } else {
      const proto = el instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      nativeSetter ? nativeSetter.call(el, text) : (el.value = text);
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function showError(msg) {
    document.getElementById('rte-modes').style.display   = 'none';
    document.getElementById('rte-loading').style.display = 'none';

    const err     = document.getElementById('rte-error');
    const errMsg  = document.getElementById('rte-error-msg');
    const errLink = document.getElementById('rte-error-link');

    errMsg.textContent  = msg;
    err.style.display   = 'block';

    // Se o erro for de chave ausente, exibe link direto para as opções
    if (msg.includes('não configurada')) {
      errLink.style.display = 'inline';
      errLink.onclick = (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openOptions' });
        closePanel();
      };
    } else {
      errLink.style.display = 'none';
    }

    setTimeout(resetPanel, 5000);
  }
})();
