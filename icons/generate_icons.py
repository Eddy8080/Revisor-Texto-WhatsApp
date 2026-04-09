"""
Gera os ícones PNG da extensão (16x16, 48x48, 128x128) em puro Python,
sem dependências externas.

Execute: python icons/generate_icons.py
"""

import struct
import zlib
import os

# Cor principal da extensão (azul Google)
BLUE  = (26, 115, 232)   # #1a73e8
WHITE = (255, 255, 255)


def _pack_chunk(chunk_type: bytes, data: bytes) -> bytes:
    raw = chunk_type + data
    return struct.pack('>I', len(data)) + raw + struct.pack('>I', zlib.crc32(raw) & 0xFFFFFFFF)


def _make_png(width: int, height: int, pixels: list) -> bytes:
    """pixels: lista de (R,G,B,A) com width*height entradas."""
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filtro None
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw += bytes([r, g, b, a])

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = _pack_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = _pack_chunk(b'IDAT', zlib.compress(raw, 9))
    iend = _pack_chunk(b'IEND', b'')
    return signature + ihdr + idat + iend


def _circle_icon(size: int) -> bytes:
    """Ícone: círculo azul com letra 'R' branca."""
    pixels = []
    cx = cy = size / 2
    r  = size / 2 - 1

    # Fonte minimalista para 'R' como segmentos vetoriais
    # Usamos anti-aliasing simples baseado em distância
    for y in range(size):
        for x in range(size):
            # Distância ao centro (círculo)
            dx, dy = x - cx + 0.5, y - cy + 0.5
            dist = (dx * dx + dy * dy) ** 0.5

            # Fundo transparente fora do círculo
            if dist > r + 0.5:
                pixels.append((0, 0, 0, 0))
                continue

            # Anti-alias na borda
            alpha = 255
            if dist > r - 0.5:
                alpha = int(255 * (r + 0.5 - dist))

            # Letra 'R' dentro do círculo (coordenadas normalizadas)
            nx = (x / size - 0.5) * 2   # -1 a 1
            ny = (y / size - 0.5) * 2   # -1 a 1

            on_r = _pixel_on_R(nx, ny, size)
            if on_r:
                pixels.append((255, 255, 255, alpha))
            else:
                pixels.append((BLUE[0], BLUE[1], BLUE[2], alpha))

    return _make_png(size, size, pixels)


def _pixel_on_R(nx: float, ny: float, size: int) -> bool:
    """
    Retorna True se a coordenada normalizada (nx, ny) pertence ao glifo 'R'.
    Haste vertical esquerda + arco superior + perna diagonal.
    """
    thick = 0.22            # espessura dos traços
    half  = thick / 2

    # Haste vertical (esquerda)
    if -0.55 < nx < -0.55 + thick and -0.60 < ny < 0.60:
        return True

    # Arco superior (semicírculo usando caixa retangular + círculo)
    arc_cx, arc_cy = -0.55 + thick / 2, -0.15
    arc_r_outer    = 0.40
    arc_r_inner    = arc_r_outer - thick
    dx = nx - (-0.55 + thick / 2 + arc_r_outer / 2 + 0.02)
    dy = ny - arc_cy
    # aproximação com dois retângulos + semicírculo
    # barra horizontal topo
    if -0.55 + thick < nx < 0.05 and -0.60 < ny < -0.60 + thick:
        return True
    # barra horizontal meio
    if -0.55 + thick < nx < 0.05 and -0.05 - half < ny < -0.05 + half:
        return True
    # arco curvo direito (vertical direita do arco)
    dist_arc = ((-nx - 0.08) ** 2 + (ny + 0.30) ** 2) ** 0.5 if nx > -0.55 + thick else 999
    if 0.28 < dist_arc < 0.28 + thick and ny < -0.05:
        return True

    # Perna diagonal (de ~centro-direita até canto inferior-direito)
    # linha de (-0.05, -0.05) até (0.40, 0.60), largura = thick
    lx1, ly1 = 0.05, -0.05
    lx2, ly2 = 0.42, 0.60
    ldx, ldy = lx2 - lx1, ly2 - ly1
    llen = (ldx * ldx + ldy * ldy) ** 0.5
    # projeção do ponto sobre o segmento
    t = ((nx - lx1) * ldx + (ny - ly1) * ldy) / (llen * llen)
    if 0 <= t <= 1:
        px = lx1 + t * ldx
        py = ly1 + t * ldy
        d  = ((nx - px) ** 2 + (ny - py) ** 2) ** 0.5
        if d < half * 0.9:
            return True

    return False


def generate():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    sizes = [16, 48, 128]
    for s in sizes:
        path = os.path.join(out_dir, f'icon{s}.png')
        data = _circle_icon(s)
        with open(path, 'wb') as f:
            f.write(data)
        print(f'Gerado: {path}  ({s}x{s})')
    print('Pronto!')


if __name__ == '__main__':
    generate()
