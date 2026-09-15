import { centerWithPadding, containFit } from '@/lib/geometry'
import { loadImg } from '@/lib/image'
import { VIEW_LABEL, type BlendModeOption, type GarmentView, type ViewSide } from '@/types/mockup'

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

// Opções do menu de export/lote (label + subtítulo) na sidebar do editor —
// vive aqui, colada no ExportFormat que ela lista.
export const EXPORT_FORMATS: { label: string; sub: string; value: ExportFormat }[] = [
  { label: 'PNG Original', sub: '720 × 1280', value: 'original' },
  { label: 'Feed Instagram', sub: '1080 × 1350 · 4:5', value: 'feed' },
  { label: 'Story Instagram', sub: '1080 × 1920 · 9:16', value: 'story' },
]

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

// view: só usada pro nome do arquivo baixado (composeMockup não precisa dela).
type ExportOptions = ComposeOptions & { view: ViewSide }

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

  // Contain-fit dentro da caixa (imgW × imgH), igual ao object-fit: contain
  // usado no preview — sem isso, resize não-uniforme no editor faz a estampa
  // aparecer inteira e proporcional no preview mas esticada/distorcida no
  // export, porque drawImage(img, x, y, w, h) preenche a caixa inteira.
  const naturalW = designImg.naturalWidth || designImg.width
  const naturalH = designImg.naturalHeight || designImg.height
  const { width: drawW, height: drawH } = containFit(imgW, imgH, naturalW, naturalH)

  ctx.save()
  ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation
  ctx.globalAlpha = opacity
  ctx.translate(cx, cy)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(designImg, -drawW / 2, -drawH / 2, drawW, drawH)
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
  const { x, y, width: dw, height: dh } = centerWithPadding(frame.w, frame.h, base.width, base.height, 0.06)
  fx.drawImage(base, x, y, dw, dh)

  return out
}

export async function exportMockup(opts: ExportOptions): Promise<void> {
  const canvas = await composeMockup(opts)
  downloadCanvas(canvas, `mockup-${VIEW_LABEL[opts.view]}-${opts.format}-${Date.now()}.png`)
}
