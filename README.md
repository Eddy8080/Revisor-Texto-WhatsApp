> **Aviso: projeto em fase experimental.** Pode conter bugs, mudanças de comportamento sem aviso e funcionalidades incompletas. Use por sua conta e risco.

# Revisor de Texto PT-BR

Extensão Chrome que injeta um botão flutuante no WhatsApp Web para revisar e melhorar textos usando **IA local (llama.cpp + LFM2.5-thinking 1.2B)**, sem precisar de Ctrl+C/Ctrl+V, sem API key e sem enviar dados à nuvem.

## Como funciona

1. Um servidor local (`llama-server.exe`) roda em segundo plano na porta `8080`
2. A extensão detecta o campo de mensagem do WhatsApp Web
3. Você clica no botão flutuante, escolhe o modo e clica em **Aplicar**
4. O texto é substituído diretamente no campo — pronto para enviar

## Modos disponíveis

| Modo | O que faz |
|---|---|
| **Melhorar** | Corrige ortografia, gramática e gírias; adota tom profissional |
| **Resumir** | Gera um resumo curto e direto, pronto para envio |

## Pré-requisitos

- Windows 10/11 x64
- CPU com suporte a AVX2 (a maioria dos processadores desde ~2013)
- ~800 MB livres em disco (motor + modelo)
- Google Chrome

## Instalação (usuário final)

1. Baixe o instalador `RevisorTexto_Setup_2.0.exe` na aba [Releases](../../releases)
2. Execute e siga o assistente
3. Aguarde ~30s para o servidor subir após a instalação
4. Abra o WhatsApp Web e pressione **F5** na aba
5. Clique no ícone da extensão no Chrome para verificar o status do servidor

## Instalação para desenvolvimento

```bash
# 1. Gerar build da extensão
python build.py

# 2. No Chrome: chrome://extensions → Modo desenvolvedor ON
#    → Carregar sem compactação → selecionar dist/extension/

# 3. Iniciar o servidor manualmente
engine\start_server.bat

# 4. Pressionar F5 no WhatsApp Web
```

## Estrutura do repositório

```
revisor_texto/
├── manifest.json          # Manifest V3 (restrito a web.whatsapp.com)
├── background.js          # Service worker — chama llama-server via fetch
├── popup/
│   ├── popup.html         # Tela de status (servidor + modelo)
│   └── popup.js           # Verifica http://localhost:8080/health
├── content/
│   ├── content.js         # Botão flutuante + painel de revisão
│   └── styles.css         # Estilos isolados (prefixo #rte-)
├── icons/
│   ├── generate_icons.py  # Gera icon16/48/128.png em Python puro
│   └── icon*.png
├── build.py               # Gera dist/extension/ + dist/revisor_texto.zip
├── revisor_texto.iss      # Script Inno Setup
└── politica.md            # Política de privacidade
```

> Os diretórios `engine/`, `redist/` e `dist/` não estão no repositório — contêm binários grandes. O `engine/` é empacotado pelo instalador Inno Setup.

## Configuração do servidor local

```
llama-server.exe -m lfm2.5-thinking.gguf --port 8080 --host 127.0.0.1 -c 8192
```

| Parâmetro | Valor | Motivo |
|---|---|---|
| `-c` | 8192 | Modelo de raciocínio gera blocos `<think>` longos — 4096 esgotava antes da resposta |
| `--host` | 127.0.0.1 | Somente loopback — sem exposição na rede local |
| `--port` | 8080 | Porta padrão do projeto |

## Status

- [x] Extensão Chrome funcional (Manifest V3)
- [x] Instalador Windows (Inno Setup)
- [x] Modo melhorar e resumir
- [x] Toolbar de formatação WhatsApp
- [ ] Validação em múltiplos PCs
- [ ] Publicação na Chrome Web Store
- [ ] Compatibilidade Firefox

## Licença

Uso pessoal. Sem garantias.
