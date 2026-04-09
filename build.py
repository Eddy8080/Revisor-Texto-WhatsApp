"""
Build da extensão Revisor de Texto.

1. Gera os ícones PNG (se não existirem)
2. Copia os arquivos para dist/extension/  (fonte para o Inno Setup)
3. Empacota dist/extension/ em dist/revisor_texto.zip

Execute: python build.py
"""

import os
import sys
import shutil
import zipfile
import importlib.util

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST      = os.path.join(ROOT, 'dist')
EXT_DIR   = os.path.join(DIST, 'extension')   # pasta descompactada para o Inno Setup

# Arquivos que entram no pacote da extensão
INCLUDE = [
    'manifest.json',
    'background.js',
    'popup/popup.html',
    'popup/popup.js',
    'content/content.js',
    'content/styles.css',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
]


def ensure_icons():
    icon_path = os.path.join(ROOT, 'icons', 'icon16.png')
    if not os.path.exists(icon_path):
        print('[build] Ícones não encontrados. Gerando...')
        spec = importlib.util.spec_from_file_location(
            'generate_icons',
            os.path.join(ROOT, 'icons', 'generate_icons.py')
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.generate()
    else:
        print('[build] Ícones OK.')


def check_files():
    missing = [r for r in INCLUDE if not os.path.exists(os.path.join(ROOT, r.replace('/', os.sep)))]
    if missing:
        print('\n[build] ERRO — arquivos não encontrados:')
        for m in missing:
            print(f'  - {m}')
        sys.exit(1)

    redist = os.path.join(ROOT, 'redist', 'vc_redist.x64.exe')
    if not os.path.exists(redist):
        print('\n[build] AVISO — redist\\vc_redist.x64.exe não encontrado.')
        print('        O instalador não incluirá o VC++ Redistributable.')
        print('        Baixe em: https://aka.ms/vs/17/release/vc_redist.x64.exe')
    else:
        print('[build] VC++ Redistributable OK.')


def build_extension_dir():
    """Copia os arquivos para dist/extension/ — usado pelo Inno Setup como fonte."""
    if os.path.exists(EXT_DIR):
        shutil.rmtree(EXT_DIR)

    for rel in INCLUDE:
        src  = os.path.join(ROOT, rel.replace('/', os.sep))
        dest = os.path.join(EXT_DIR, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(src, dest)
        print(f'  + {rel}')

    print(f'\n[build] Pasta de extensão: {EXT_DIR}')


def build_zip():
    """Gera o .zip a partir de dist/extension/."""
    out_path = os.path.join(DIST, 'revisor_texto.zip')

    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for rel in INCLUDE:
            full = os.path.join(EXT_DIR, rel.replace('/', os.sep))
            zf.write(full, rel)

    size_kb = os.path.getsize(out_path) / 1024
    print(f'[build] ZIP gerado:       {out_path}  ({size_kb:.1f} KB)')


if __name__ == '__main__':
    print('=== Build — Revisor de Texto ===\n')
    ensure_icons()
    check_files()
    print('\n[build] Copiando arquivos para dist/extension/ ...')
    build_extension_dir()
    print('\n[build] Gerando ZIP ...')
    build_zip()
    print('\n[build] Concluído!')
    print('        dist/extension/      -> fonte para o Inno Setup')
    print('        dist/revisor_texto.zip -> carga manual no Chrome/Firefox')
