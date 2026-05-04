# Script para atualizar o modelo do DigIAna
# Modelo: Qwen 2.5 3B Instruct (GGUF - Q4_K_M)
# Mirror: ModelScope (Mais estável para downloads via script)

$modelUrl = "https://modelscope.cn/models/qwen/Qwen2.5-3B-Instruct-GGUF/resolve/master/qwen2.5-3b-instruct-q4_k_m.gguf"
$newModelName = "qwen2.5-3b-instruct-q4_k_m.gguf"
$oldModelName = "lfm2.5-thinking.gguf"
$engineDir = Join-Path (Get-Location) "engine"
$targetPath = Join-Path $engineDir $newModelName

if (!(Test-Path $engineDir)) {
    Write-Host "[-] Pasta 'engine' não encontrada. Execute o script na raiz do projeto." -ForegroundColor Red
    exit
}

# Remove arquivo de 10 bytes ou tentativas corrompidas
if (Test-Path $targetPath) {
    Remove-Item $targetPath -Force
}

Write-Host "[+] Iniciando download do Qwen 2.5 3B via Mirror ModelScope..." -ForegroundColor Cyan
Write-Host "[+] Aguarde... Isso pode levar alguns minutos (1.93 GB)." -ForegroundColor Cyan

try {
    # Usando curl.exe diretamente com flags de resiliência
    # -L: Segue redirecionamentos
    # -f: Falha silenciosamente em erros HTTP
    # -# : Mostra barra de progresso simples
    curl.exe -L -f -# -o "$targetPath" "$modelUrl"
    
    if ($LASTEXITCODE -ne 0) { throw "Erro no curl (Exit Code: $LASTEXITCODE)" }

    $fileSize = (Get-Item "$targetPath").Length
    if ($fileSize -lt 100MB) {
        throw "Arquivo baixado é muito pequeno ($($fileSize / 1KB) KB). Mirror pode estar instável."
    }

    Write-Host "[+] Download concluído com sucesso! ($([Math]::Round($fileSize / 1GB, 2)) GB)" -ForegroundColor Green
} catch {
    Write-Host "[-] Erro no download automático: $_" -ForegroundColor Red
    Write-Host "[!] Como última alternativa, baixe manualmente no navegador pelo link abaixo:" -ForegroundColor Yellow
    Write-Host "    $modelUrl" -ForegroundColor White
    Write-Host "[!] E salve como '$newModelName' na pasta 'engine'." -ForegroundColor Yellow
    exit
}

$oldModelPath = Join-Path $engineDir $oldModelName
if (Test-Path $oldModelPath) {
    Write-Host "[+] Removendo modelo antigo ($oldModelName)..." -ForegroundColor Yellow
    Remove-Item $oldModelPath -Force
}

Write-Host "[+] Tudo pronto! Modelo Qwen 2.5 3B instalado com sucesso." -ForegroundColor Green
Write-Host "[!] Agora você pode rodar 'python build.py'." -ForegroundColor Cyan
