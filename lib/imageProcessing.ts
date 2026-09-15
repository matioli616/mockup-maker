import { loadImg } from '@/lib/image'

// "Knockout" de preto: torna transparentes os pixels escuros da estampa,
// deixando o preto real do tecido aparecer por baixo em vez do preto chapado
// do PNG — a estampa fica menos "sintética" na foto final.
export interface KnockoutOptions {
  enabled: boolean
  threshold: number // 0-255 — luminância abaixo disso vira 100% transparente
  feather: number // faixa (em luminância) da transição transparente → opaco
}

export const DEFAULT_KNOCKOUT: KnockoutOptions = {
  enabled: false,
  threshold: 40,
  feather: 50,
}

// Multiplicador de alfa (0-1) pra um pixel de luminância `lum`: 0 abaixo do
// threshold (vira transparente), 1 acima de threshold+feather (opaco), e uma
// rampa linear na faixa "feather" entre os dois — é a curva de transição do
// knockout. Pura (sem canvas), separada do loop de pixels só pra poder
// testar a curva sem mockar ImageData.
export function alphaMultiplierForLuminance(lum: number, threshold: number, feather: number): number {
  const t = Math.max(0, threshold)
  const upper = t + Math.max(1, feather)
  if (lum <= t) return 0
  if (lum >= upper) return 1
  return (lum - t) / (upper - t)
}

export async function applyBlackKnockout(src: string, opts: KnockoutOptions): Promise<string> {
  if (!opts.enabled) return src

  const img = await loadImg(src)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return src

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  const frame = ctx.getImageData(0, 0, w, h)
  const d = frame.data

  for (let i = 0; i < d.length; i += 4) {
    // luminância perceptual (Rec. 601)
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const mul = alphaMultiplierForLuminance(lum, opts.threshold, opts.feather)
    if (mul < 1) d[i + 3] = Math.round(d[i + 3] * mul)
  }

  ctx.putImageData(frame, 0, 0)
  return canvas.toDataURL('image/png')
}
