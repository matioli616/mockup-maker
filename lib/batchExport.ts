import JSZip from 'jszip'
import { composeMockup, type ExportFormat } from '@/lib/export'
import { fileToDataURL } from '@/lib/image'
import { applyBlackKnockout, type KnockoutOptions } from '@/lib/imageProcessing'
import { VIEW_LABEL, type DesignTransform, type GarmentView, type ViewSide } from '@/types/mockup'

export interface BatchItem {
  file: File
  name: string
}

const VIEWS: ViewSide[] = ['front', 'back']

export interface BatchOptions {
  garments: Record<ViewSide, GarmentView>
  // transform de cada lado — os dois obrigatórios, já preenchidos assim que
  // uma estampa é carregada (ver MockupEditor).
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
  // nomes originais dos arquivos que falharam (imagem corrompida, etc.) —
  // o lote continua e baixa o .zip com o que deu certo.
  failed: string[]
}

// Pra cada estampa do lote, gera frente E verso (mesma posição/config já
// ajustada em cada lado) e numera pra casar produto = par de fotos na hora
// de subir no Shopify: 001-frente.png + 001-verso.png, 002-frente.png, ...
export async function exportBatch(items: BatchItem[], opts: BatchOptions): Promise<BatchResult> {
  const zip = new JSZip()
  const total = items.length
  const failed: string[] = []

  for (let i = 0; i < total; i++) {
    const num = String(i + 1).padStart(3, '0')
    try {
      const raw = await fileToDataURL(items[i].file)
      const designSrc = await applyBlackKnockout(raw, opts.knockout)

      for (const view of VIEWS) {
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
      // uma estampa ruim no lote não pode derrubar as outras 49
      console.error(`[batchExport] falha ao processar "${items[i].name}":`, err)
      failed.push(items[i].name)
    }

    opts.onProgress?.(i + 1, total)
    // cede o main thread entre imagens pra sidebar/progresso continuar responsivos
    await new Promise((r) => requestAnimationFrame(r))
  }

  if (Object.keys(zip.files).length === 0) {
    throw new Error('Nenhuma estampa do lote pôde ser processada.')
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
