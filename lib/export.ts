import { loadImg } from '@/lib/image'
import type { BlendModeOption, GarmentView } from '@/types/mockup'

export type ExportFormat = 'original' | 'feed' | 'story'

interface FrameSize {
  w: number
  h: number
}

// null = exporta a imagem da peça no tamanho original
const FRAME_SIZES: Record<ExportFormat, FrameSize | null> = {
  original: null,
  feed: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
}

export interface ComposeOptions {
  garmentView: GarmentView
  designSrc: string
  // Design position/size in display coordinates
  displayX: number
  displayY: number
  displayW: number
  displayH: number
  displayContainerW: number
  displayContainerH: number
  rotation: number
  opacity: number
  blendMode: BlendModeOption
  format: ExportFormat
  realism: boolean
}

type ExportOptions = ComposeOptions

// Cor de fundo pros formatos de post — amostra um pixel do canto da peça
// pra emendar sem costura visível com o fundo já presente na foto.
function sampleCorner(canvas: HTMLCanvasElement): string {
  try {
    const ctx = canvas.getContext('2d')
    if (!ctx) return '#ededed'
    const d = ctx.getImageData(2, 2, 1, 1).data
    return `rgb(${d[0]}, ${d[1]}, ${d[2]})`
  } catch {
    return '#ededed'
  }
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

// Compõe peça + estampa (+ realismo) + formato de saída, e devolve o canvas
// pronto — sem baixar. Usado tanto pelo export único quanto pelo lote.
export async function composeMockup(opts: ComposeOptions): Promise<HTMLCanvasElement> {
  const {
    garmentView,
    designSrc,
    displayX, displayY, displayW, displayH,
    displayContainerW, displayContainerH,
    rotation, opacity, blendMode,
    format, realism,
  } = opts

  const { imageWidth, imageHeight } = garmentView

  // Scale factors: display → original image coordinates
  const scaleX = imageWidth / displayContainerW
  const scaleY = imageHeight / displayContainerH

  // ─── Canvas base: peça + estampa na resolução original ───────────────────
  const base = document.createElement('canvas')
  base.width = imageWidth
  base.height = imageHeight
  const ctx = base.getContext('2d')!

  // 1. Fundo: a peça
  const shirtImg = await loadImg(garmentView.image)
  ctx.drawImage(shirtImg, 0, 0, imageWidth, imageHeight)

  // 2. Estampa com transform
  const designImg = await loadImg(designSrc)

  const imgX = displayX * scaleX
  const imgY = displayY * scaleY
  const imgW = displayW * scaleX
  const imgH = displayH * scaleY
  const cx = imgX + imgW / 2
  const cy = imgY + imgH / 2

  ctx.save()
  ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation
  ctx.globalAlpha = opacity
  ctx.translate(cx, cy)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(designImg, -imgW / 2, -imgH / 2, imgW, imgH)
  ctx.restore()

  // 3. Realismo: reaplica a peça em multiply sutil pra trazer dobras/textura
  //    do tecido por cima da estampa (efeito de estampa DTG).
  if (realism) {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.18
    ctx.drawImage(shirtImg, 0, 0, imageWidth, imageHeight)
    ctx.restore()
  }

  // ─── Formato de saída ────────────────────────────────────────────────────
  const frame = FRAME_SIZES[format]
  if (!frame) return base

  const out = document.createElement('canvas')
  out.width = frame.w
  out.height = frame.h
  const fx = out.getContext('2d')!

  fx.fillStyle = sampleCorner(base)
  fx.fillRect(0, 0, frame.w, frame.h)

  // Centraliza a peça com um respiro (padding) dentro do frame
  const pad = Math.round(frame.w * 0.06)
  const availW = frame.w - pad * 2
  const availH = frame.h - pad * 2
  const s = Math.min(availW / base.width, availH / base.height)
  const dw = base.width * s
  const dh = base.height * s
  fx.drawImage(base, (frame.w - dw) / 2, (frame.h - dh) / 2, dw, dh)

  return out
}

export async function exportMockup(opts: ExportOptions): Promise<void> {
  const canvas = await composeMockup(opts)
  downloadCanvas(canvas, `mockup-${opts.format}-${Date.now()}.png`)
}
