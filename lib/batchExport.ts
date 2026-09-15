import JSZip from 'jszip'
import { composeMockup, type ExportFormat } from '@/lib/export'
import { fileToDataURL } from '@/lib/image'
import { applyBlackKnockout, type KnockoutOptions } from '@/lib/imageProcessing'
import { VIEW_LABEL, type DesignTransform, type GarmentView, type ViewSide } from '@/types/mockup'

export interface BatchItem {
  file: File
  name: string
}

// Um par por produto: a estampa da frente e a do verso daquele produto —
// combinadas pela ordem em que o usuário selecionou cada lista (a N-ésima
// da frente com a N-ésima do verso).
export interface BatchPair {
  front: BatchItem
  back: BatchItem
}

const VIEWS: ViewSide[] = ['front', 'back']

export interface BatchOptions {
  garments: Record<ViewSide, GarmentView>
  // transform de cada lado — os dois obrigatórios, já ajustados no editor.
  transforms: Record<ViewSide, DesignTransform>
  displayContainerW: number
  displayContainerH: number
  format: ExportFormat
  realism: boolean
  knockout: KnockoutOptions
  onProgress?: (done: number, total: number) => void
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob falhou'))), 'image/png')
  })
}

export interface BatchResult {
  // descrição dos pares que falharam (nome frente/verso) — o lote continua
  // e baixa o .zip com o que deu certo.
  failed: string[]
}

// Pra cada par (frente, verso), gera as duas mockups (mesma posição/config
// já ajustada em cada lado) e numera pra casar produto = par de fotos na
// hora de subir no Shopify: 001-frente.png + 001-verso.png, 002-frente.png,
// 002-verso.png, ...
export async function exportBatch(pairs: BatchPair[], opts: BatchOptions): Promise<BatchResult> {
  const zip = new JSZip()
  const total = pairs.length
  const failed: string[] = []

  for (let i = 0; i < total; i++) {
    const num = String(i + 1).padStart(3, '0')
    const pair = pairs[i]
    try {
      for (const view of VIEWS) {
        const item = pair[view]
        const raw = await fileToDataURL(item.file)
        const designSrc = await applyBlackKnockout(raw, opts.knockout)
        const t = opts.transforms[view]
        const canvas = await composeMockup({
          garmentView: opts.garments[view],
          designSrc,
          displayX: t.x,
          displayY: t.y,
          displayW: t.width,
          displayH: t.height,
          displayContainerW: opts.displayContainerW,
          displayContainerH: opts.displayContainerH,
          rotation: t.rotation,
          opacity: t.opacity,
          blendMode: t.blendMode,
          format: opts.format,
          realism: opts.realism,
        })
        const blob = await canvasToBlob(canvas)
        zip.file(`${num}-${VIEW_LABEL[view]}.png`, blob)
      }
    } catch (err) {
      // um par ruim no lote não pode derrubar os outros
      console.error(`[batchExport] falha ao processar par "${pair.front.name}" / "${pair.back.name}":`, err)
      failed.push(`${pair.front.name} / ${pair.back.name}`)
    }

    opts.onProgress?.(i + 1, total)
    // cede o main thread entre produtos pra sidebar/progresso continuar responsivos
    await new Promise((r) => requestAnimationFrame(r))
  }

  if (Object.keys(zip.files).length === 0) {
    throw new Error('Nenhum par do lote pôde ser processado.')
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mockups-lote-${Date.now()}.zip`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)

  return { failed }
}
