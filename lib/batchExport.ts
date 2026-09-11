import JSZip from 'jszip'
import { composeMockup, type ExportFormat } from '@/lib/export'
import { fileToDataURL } from '@/lib/image'
import { applyBlackKnockout, type KnockoutOptions } from '@/lib/imageProcessing'
import type { BlendModeOption, GarmentView } from '@/types/mockup'

export interface BatchItem {
  file: File
  name: string
}

export interface BatchOptions {
  garmentView: GarmentView
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
  knockout: KnockoutOptions
  onProgress?: (done: number, total: number) => void
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob falhou'))), 'image/png')
  })
}

function sanitizeName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'estampa'
}

// Aplica a MESMA posição/tamanho/rotação/opacidade/blend/realismo/knockout
// já ajustados na primeira estampa a todas as outras do lote, e baixa um .zip.
export async function exportBatch(items: BatchItem[], opts: BatchOptions): Promise<void> {
  const zip = new JSZip()
  const total = items.length

  for (let i = 0; i < total; i++) {
    const raw = await fileToDataURL(items[i].file)
    const designSrc = await applyBlackKnockout(raw, opts.knockout)
    const canvas = await composeMockup({
      garmentView: opts.garmentView,
      designSrc,
      displayX: opts.displayX,
      displayY: opts.displayY,
      displayW: opts.displayW,
      displayH: opts.displayH,
      displayContainerW: opts.displayContainerW,
      displayContainerH: opts.displayContainerH,
      rotation: opts.rotation,
      opacity: opts.opacity,
      blendMode: opts.blendMode,
      format: opts.format,
      realism: opts.realism,
    })
    const blob = await canvasToBlob(canvas)
    const filename = `${String(i + 1).padStart(3, '0')}-${sanitizeName(items[i].name)}.png`
    zip.file(filename, blob)

    opts.onProgress?.(i + 1, total)
    // cede o main thread entre imagens pra sidebar/progresso continuar responsivos
    await new Promise((r) => requestAnimationFrame(r))
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mockups-lote-${Date.now()}.zip`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
