const HEALTH_URL = 'http://localhost:8080/health';

document.addEventListener('DOMContentLoaded', () => {
  checkStatus();

  document.getElementById('btnCheck').addEventListener('click', checkStatus);
  document.getElementById('btnWake').addEventListener('click', wakeServer);

  document.getElementById('lnkSaibaMais').addEventListener('click', () => {
    const guide = document.getElementById('guide');
    guide.style.display = (guide.style.display === 'block' || guide.style.display === '') ? 'none' : 'block';
  });
});

async function checkStatus() {
  const btnCheck = document.getElementById('btnCheck');
  btnCheck.disabled = true;
  btnCheck.textContent = 'Verificando...';

  setBadge('badgeServer', 'loading', 'verificando...');
  setBadge('badgeModel',  'loading', 'verificando...');

  try {
    const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(3000) });
    const data     = await response.json();
    const ok       = data?.status === 'ok';

    if (ok) {
      setOnline();
    } else {
      throw new Error('not ready');
    }
  } catch {
    setOffline();
  }

  btnCheck.disabled = false;
  btnCheck.textContent = 'Verificar novamente';
}

function setOnline() {
  setBadge('badgeServer', 'ok', 'em execução');
  setBadge('badgeModel',  'ok', 'carregado');
  document.getElementById('guide').style.display   = 'none';
  document.getElementById('btnWake').style.display = 'none';
}

function setOffline() {
  setBadge('badgeServer', 'error', 'offline');
  setBadge('badgeModel',  'error', '—');
  document.getElementById('btnWake').style.display = 'block';
}

async function wakeServer() {
  const btn = document.getElementById('btnWake');
  btn.disabled = true;
  btn.textContent = 'Iniciando...';

  // Dispara o protocol handler registrado pelo instalador.
  // O Windows executa wake_server.ps1, que inicia o llama-server.
  window.open('digiana-start://');

  // Aguarda o modelo carregar (até 60s, verificando a cada 5s)
  let attempts = 0;
  const MAX = 12;
  const timer = setInterval(async () => {
    attempts++;
    try {
      const resp = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
      const data = await resp.json();
      if (data?.status === 'ok') {
        clearInterval(timer);
        setOnline();
        btn.disabled = false;
        btn.textContent = 'Acordar Servidor';
        return;
      }
    } catch {}

    if (attempts >= MAX) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = 'Tentar novamente';
    } else {
      btn.textContent = `Aguardando... (${attempts * 5}s)`;
    }
  }, 5000);
}

function setBadge(id, state, text) {
  const el  = document.getElementById(id);
  const map = {
    ok:      { cls: 'badge-ok',      dot: 'dot-ok'      },
    error:   { cls: 'badge-error',   dot: 'dot-error'   },
    loading: { cls: 'badge-loading', dot: 'dot-loading' },
  };
  const { cls, dot } = map[state];
  el.className  = `badge ${cls}`;
  el.innerHTML  = `<span class="dot ${dot}"></span>${text}`;
}
