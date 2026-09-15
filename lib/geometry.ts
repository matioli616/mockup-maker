// Matemática pura de posicionamento usada no export (lib/export.ts) — sem
// canvas/DOM, só números. Separado pra poder testar sem mockar
// HTMLCanvasElement/Image.

export interface Size {
  width: number
  height: number
}

export interface Rect extends Size {
  x: number
  y: number
}

// Encaixa (naturalW × naturalH) dentro de uma caixa (boxW × boxH) preservando
// proporção — igual a `object-fit: contain`. Usado pro export bater com o
// preview: sem isso, um resize não-uniforme no editor deixa a estampa
// esticada no PNG final mesmo aparecendo proporcional na tela.
export function containFit(boxW: number, boxH: number, naturalW: number, naturalH: number): Size {
  if (!naturalW || !naturalH) return { width: boxW, height: boxH }
  const fit = Math.min(boxW / naturalW, boxH / naturalH)
  return { width: naturalW * fit, height: naturalH * fit }
}

// Centraliza (contentW × contentH) dentro de um frame (frameW × frameH) com
// uma margem proporcional ao frame (`paddingRatio`, ex.: 0.06 = 6% de cada
// lado) — usado pra encaixar a peça dentro do formato de post (feed/story)
// com um respiro em volta.
export function centerWithPadding(
  frameW: number,
  frameH: number,
  contentW: number,
  contentH: number,
  paddingRatio: number,
): Rect {
  const pad = Math.round(frameW * paddingRatio)
  const availW = frameW - pad * 2
  const availH = frameH - pad * 2
  const s = Math.min(availW / contentW, availH / contentH)
  const w = contentW * s
  const h = contentH * s
  return { x: (frameW - w) / 2, y: (frameH - h) / 2, width: w, height: h }
}
