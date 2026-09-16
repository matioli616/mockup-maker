'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { exportBatch } from '@/lib/batchExport'
import {
  parseStoredState,
  serializeState,
  STORAGE_KEY,
  toDisplayTransform,
  type PersistedTransforms,
} from '@/lib/editorPersistence'
import { exportMockup, type ExportFormat } from '@/lib/export'
import { defaultTransformFor, GARMENT } from '@/lib/garments'
import { applyBlackKnockout, DEFAULT_KNOCKOUT, type KnockoutOptions } from '@/lib/imageProcessing'
import { getDesign, setDesign } from '@/lib/imageStore'
import { buildShopifyCsv, downloadCsv } from '@/lib/shopifyCsv'
import type { DesignTransform, ViewSide } from '@/types/mockup'
import EditorCanvas from './EditorCanvas'
import EditorHeader from './EditorHeader'
import EditorSidebar, { type CsvFields } from './EditorSidebar'
import ErrorToast from './ErrorToast'
import { useContainerSize } from './useContainerSize'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

const DEFAULT_CSV: CsvFields = { vendor: '', type: 'Camiseta Oversized', tags: '', price: '', qty: '' }

// ─── Main Editor ──────────────────────────────────────────────────────────────
// Container: dono de todo o estado + regras de negócio. A apresentação vive
// em EditorHeader/EditorSidebar/EditorCanvas (components/editor/), e a lógica
// pura (persistência, geometria, config da peça) em lib/.
export default function MockupEditor() {
  const [view, setView] = useState<ViewSide>('front')
  // Estampa por lado (frente/verso) — são desenhos diferentes, não a mesma
  // imagem reposicionada (ex.: logo pequeno no peito x arte no verso).
  const [designSrcs, setDesignSrcs] = useState<Record<ViewSide, string | null>>({
    front: null,
    back: null,
  })
  const designSrc = designSrcs[view]
  // Transform por lado (frente/verso) — trocar de view não mexe na posição
  // do outro lado.
  const [transforms, setTransforms] = useState<Record<ViewSide, DesignTransform | null>>({
    front: null,
    back: null,
  })
  const transform = transforms[view]
  const [showGuide, setShowGuide] = useState(true)
  const [realism, setRealism] = useState(false)
  const [knockout, setKnockout] = useState<KnockoutOptions>(DEFAULT_KNOCKOUT)
  const [processedDesignSrc, setProcessedDesignSrc] = useState<string | null>(null)
  const [selected, setSelected] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // ─── Erros (upload, processamento, export) — antes falhavam em silêncio ───
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const storageWarnedRef = useRef(false)
  const showError = useCallback((msg: string) => {
    setErrorMsg(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 6000)
  }, [])

  // ─── Lote pareado: lista de frente + lista de verso, combinadas pela ordem
  // (1ª da frente com 1ª do verso = produto 001, e assim por diante) — frente
  // e verso são desenhos diferentes, cada lista tem sua própria config
  // (posição/tamanho/rotação) já ajustada no editor pro lado respectivo.
  const [batchFront, setBatchFront] = useState<File[]>([])
  const [batchBack, setBatchBack] = useState<File[]>([])
  const [batchExporting, setBatchExporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)

  const mainRef = useRef<HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchFrontInputRef = useRef<HTMLInputElement>(null)
  const batchBackInputRef = useRef<HTMLInputElement>(null)
  const exportWrapRef = useRef<HTMLDivElement>(null)
  // transforms restaurados do localStorage (coords de imagem), aplicados quando o scale existir
  const restoredRef = useRef<PersistedTransforms | null>(null)

  const { containerSize, scale } = useContainerSize(mainRef)

  // ─── Hidratação: restaura o último estado ──────────────────────────────────
  useEffect(() => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(STORAGE_KEY)
    } catch {
      /* localStorage indisponível — começa limpo */
    }
    const parsed = parseStoredState(raw, DEFAULT_KNOCKOUT)
    if (parsed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata estado de fonte externa (localStorage), roda uma única vez no mount
      if (parsed.view) setView(parsed.view)
      if (parsed.realism !== null) setRealism(parsed.realism)
      if (parsed.knockout) setKnockout(parsed.knockout)
      if (parsed.transforms) restoredRef.current = parsed.transforms
    }

    const legacyDesigns = parsed?.legacyDesigns ?? null
    if (legacyDesigns) {
      // formato antigo (v1-v3) guardava a(s) imagem(ns) junto no localStorage
      // — migra pro IndexedDB (o próximo autosave já não regrava mais isso
      // no localStorage, então a cota se libera sozinha).
      setDesignSrcs(legacyDesigns)
      if (legacyDesigns.front) void setDesign('front', legacyDesigns.front)
      if (legacyDesigns.back) void setDesign('back', legacyDesigns.back)
      setHydrated(true)
    } else {
      // formato atual (v4): imagem só vive no IndexedDB
      Promise.all([getDesign('front'), getDesign('back')])
        .then(([front, back]) => setDesignSrcs({ front, back }))
        .catch(() => {
          /* IndexedDB indisponível — segue sem estampa restaurada */
        })
        .finally(() => setHydrated(true))
    }
  }, [])

  // ─── Aplica os transforms restaurados assim que o scale estiver disponível ─
  useEffect(() => {
    if (!hydrated || !scale) return
    const restored = restoredRef.current
    if (restored) {
      restoredRef.current = null
      setTransforms({
        front: toDisplayTransform(restored.front, scale),
        back: toDisplayTransform(restored.back, scale),
      })
      setSelected(true)
      return
    }
    // designSrc restaurado sem transform pro respectivo lado (situação anômala) — cai no default
    setTransforms((t) => ({
      front: t.front ?? (designSrcs.front ? defaultTransformFor(GARMENT, 'front', scale) : null),
      back: t.back ?? (designSrcs.back ? defaultTransformFor(GARMENT, 'back', scale) : null),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, scale])

  // ─── Persiste o estado a cada mudança relevante ───────────────────────────
  useEffect(() => {
    if (!hydrated || !scale) return
    try {
      // v4: as imagens NÃO entram mais aqui — vivem no IndexedDB (efeitos
      // abaixo), esse payload fica pequeno e nunca estoura a cota do
      // localStorage sozinho.
      localStorage.setItem(STORAGE_KEY, serializeState({ view, realism, knockout, transforms, scale }))
    } catch (err) {
      console.warn('[SixOneSix] falha ao salvar estado no localStorage:', err)
      if (!storageWarnedRef.current) {
        storageWarnedRef.current = true
        showError('Não foi possível salvar automaticamente (armazenamento local cheio ou indisponível).')
      }
    }
  }, [hydrated, scale, view, realism, knockout, transforms, showError])

  // ─── Persiste cada estampa no IndexedDB quando ela muda ───────────────────
  useEffect(() => {
    if (!hydrated) return
    void setDesign('front', designSrcs.front)
  }, [hydrated, designSrcs.front])
  useEffect(() => {
    if (!hydrated) return
    void setDesign('back', designSrcs.back)
  }, [hydrated, designSrcs.back])

  // ─── Recalcula a estampa com knockout de preto (preview + export) ─────────
  useEffect(() => {
    let cancelled = false
    if (!designSrc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deriva a estampa "efetiva" (processada) de designSrc/knockout
      setProcessedDesignSrc(null)
      return
    }
    if (!knockout.enabled) {
      setProcessedDesignSrc(designSrc)
      return
    }
    applyBlackKnockout(designSrc, knockout)
      .then((out) => {
        if (!cancelled) setProcessedDesignSrc(out)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[SixOneSix] falha ao aplicar knockout de preto:', err)
        showError('Falha ao processar "remover preto" — usando a estampa original.')
        setProcessedDesignSrc(designSrc)
      })
    return () => {
      cancelled = true
    }
  }, [designSrc, knockout, showError])

  const updateTransform = useCallback(
    (patch: Partial<DesignTransform>) => {
      setTransforms((t) => (t[view] ? { ...t, [view]: { ...t[view]!, ...patch } } : t))
    },
    [view],
  )

  const resetPosition = useCallback(() => {
    if (!scale) return
    setTransforms((t) => ({ ...t, [view]: defaultTransformFor(GARMENT, view, scale) }))
    setSelected(true)
  }, [view, scale])

  const handleFileUpload = useCallback(
    // targetView: qual lado recebe a estampa — o padrão é o lado aberto na
    // tela (upload manual); os pickers de lote passam 'front'/'back' explícito.
    (file: File, targetView: ViewSide = view) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target?.result as string
        // Frente e verso são desenhos diferentes (ex.: logo no peito x arte
        // no verso) — nunca a mesma imagem repetida dos dois lados.
        setDesignSrcs((d) => ({ ...d, [targetView]: src }))
        const s = scale || 1
        setTransforms((t) => ({ ...t, [targetView]: defaultTransformFor(GARMENT, targetView, s) }))
        setSelected(true)
      }
      reader.onerror = () => {
        showError(`Não foi possível ler "${file.name}". Tente outra imagem.`)
      }
      reader.readAsDataURL(file)
    },
    [view, scale, showError],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (!file) return
      if (file.type.startsWith('image/')) {
        handleFileUpload(file)
      } else {
        showError('Arquivo inválido — envie uma imagem (PNG, JPG ou SVG).')
      }
    },
    [handleFileUpload, showError],
  )

  const removeDesign = useCallback(() => {
    // Remove só a estampa do lado ativo — o outro lado continua intacto.
    setDesignSrcs((d) => ({ ...d, [view]: null }))
    setTransforms((t) => ({ ...t, [view]: null }))
    setSelected(false)
  }, [view])

  const nudge = useCallback(
    (dx: number, dy: number) => {
      setTransforms((t) =>
        t[view] ? { ...t, [view]: { ...t[view]!, x: t[view]!.x + dx, y: t[view]!.y + dy } } : t,
      )
    },
    [view],
  )
  const toggleView = useCallback(() => setView((v) => (v === 'front' ? 'back' : 'front')), [])
  const deselectAndCloseMenu = useCallback(() => {
    setSelected(false)
    setMenuOpen(false)
  }, [])
  useKeyboardShortcuts({
    designSrc,
    selected,
    onNudge: nudge,
    onRemove: removeDesign,
    onResetPosition: resetPosition,
    onToggleView: toggleView,
    onDeselect: deselectAndCloseMenu,
  })

  // ─── Fecha o menu de export ao clicar fora ────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (!exportWrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const runExport = useCallback(
    async (format: ExportFormat) => {
      setMenuOpen(false)
      if (!designSrc || !transform || !containerSize.w) return
      setExporting(true)
      try {
        await exportMockup({
          garmentView: GARMENT[view],
          designSrc: processedDesignSrc ?? designSrc,
          displayX: transform.x,
          displayY: transform.y,
          displayW: transform.width,
          displayH: transform.height,
          displayContainerW: containerSize.w,
          displayContainerH: containerSize.h,
          rotation: transform.rotation,
          opacity: transform.opacity,
          blendMode: transform.blendMode,
          format,
          realism,
          view,
        })
      } catch (err) {
        console.error('[SixOneSix] falha ao exportar mockup:', err)
        showError('Falha ao exportar o mockup. Tente novamente.')
      } finally {
        setExporting(false)
      }
    },
    [designSrc, processedDesignSrc, transform, containerSize.w, containerSize.h, view, realism, showError],
  )

  // ─── Lote pareado: seleciona N imagens pra um lado, carrega a 1ª pro
  // posicionamento normal daquele lado (a lista do outro lado não mexe) ────
  const handleBatchFilesSelected = useCallback(
    (targetView: ViewSide, files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (!arr.length) {
        showError('Nenhuma imagem válida selecionada.')
        return
      }
      if (targetView === 'front') setBatchFront(arr)
      else setBatchBack(arr)
      handleFileUpload(arr[0], targetView)
    },
    [handleFileUpload, showError],
  )

  const clearBatch = useCallback(() => {
    setBatchFront([])
    setBatchBack([])
  }, [])

  // Lote pareado: as duas listas podem ter quantidades diferentes — combinam
  // pela ordem (1ª da frente com 1ª do verso = produto 001, e assim por
  // diante) e um produto sem imagem de um lado sai só com o outro. Só exige
  // a posição do lado que de fato tem alguma imagem no lote.
  const batchTotal = Math.max(batchFront.length, batchBack.length)
  const batchReady =
    batchTotal > 0 &&
    (batchFront.length === 0 || !!transforms.front) &&
    (batchBack.length === 0 || !!transforms.back)

  const runBatchExport = useCallback(
    async (format: ExportFormat) => {
      if (!batchReady || !containerSize.w) return
      setBatchExporting(true)
      setBatchProgress({ done: 0, total: batchTotal })
      try {
        const pairs = Array.from({ length: batchTotal }, (_, i) => ({
          front: batchFront[i] ? { file: batchFront[i], name: batchFront[i].name } : undefined,
          back: batchBack[i] ? { file: batchBack[i], name: batchBack[i].name } : undefined,
        }))
        const result = await exportBatch(pairs, {
          garments: { front: GARMENT.front, back: GARMENT.back },
          transforms: { front: transforms.front, back: transforms.back },
          displayContainerW: containerSize.w,
          displayContainerH: containerSize.h,
          format,
          realism,
          knockout,
          onProgress: (done, total) => setBatchProgress({ done, total }),
        })
        if (result.failed.length) {
          showError(
            `${result.failed.length} produto(s) falharam e ficaram de fora do .zip: ${result.failed.join('; ')}`,
          )
        }
      } catch (err) {
        console.error('[SixOneSix] falha ao gerar lote:', err)
        showError('Falha ao gerar o lote. Tente novamente.')
      } finally {
        setBatchExporting(false)
        setBatchProgress(null)
      }
    },
    [batchReady, batchFront, batchBack, transforms, containerSize.w, containerSize.h, realism, knockout, showError],
  )

  // ─── CSV de importação do Shopify (metadados — sem imagem, ver lib/shopifyCsv) ──
  const [csv, setCsv] = useState<CsvFields>(DEFAULT_CSV)
  const onCsvChange = useCallback(
    (field: keyof CsvFields, value: string) => setCsv((c) => ({ ...c, [field]: value })),
    [],
  )

  const downloadShopifyCsv = useCallback(() => {
    if (!batchReady) return
    const rows = Array.from({ length: batchTotal }, (_, i) => ({
      num: String(i + 1).padStart(3, '0'),
      vendor: csv.vendor,
      productType: csv.type,
      tags: csv.tags,
      price: csv.price,
      inventoryQty: csv.qty,
    }))
    downloadCsv(buildShopifyCsv(rows), `shopify-produtos-${Date.now()}.csv`)
  }, [batchReady, batchTotal, csv])

  const garmentView = GARMENT[view]
  const printArea = garmentView.printArea
  const guide = {
    x: printArea.x * scale,
    y: printArea.y * scale,
    width: printArea.width * scale,
    height: printArea.height * scale,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {errorMsg && <ErrorToast message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      <EditorHeader
        view={view}
        onViewChange={setView}
        designSrc={designSrc}
        exporting={exporting}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
        exportWrapRef={exportWrapRef}
        onExport={runExport}
      />

      <div style={{ flex: 1, display: 'flex', gap: '0', overflow: 'hidden' }}>
        <EditorSidebar
          view={view}
          designSrc={designSrc}
          fileInputRef={fileInputRef}
          onFileChange={handleFileUpload}
          onUploadClick={() => fileInputRef.current?.click()}
          onRemoveDesign={removeDesign}
          batchFront={batchFront}
          batchBack={batchBack}
          batchFrontInputRef={batchFrontInputRef}
          batchBackInputRef={batchBackInputRef}
          batchExporting={batchExporting}
          batchProgress={batchProgress}
          batchTotal={batchTotal}
          batchReady={batchReady}
          onBatchFiles={handleBatchFilesSelected}
          onClearBatch={clearBatch}
          onRunBatchExport={runBatchExport}
          csv={csv}
          onCsvChange={onCsvChange}
          onDownloadCsv={downloadShopifyCsv}
          transform={transform}
          containerSize={containerSize}
          scale={scale}
          onUpdateTransform={updateTransform}
          realism={realism}
          onRealismChange={setRealism}
          knockout={knockout}
          onKnockoutChange={setKnockout}
          showGuide={showGuide}
          onShowGuideChange={setShowGuide}
          onResetPosition={resetPosition}
        />

        <EditorCanvas
          mainRef={mainRef}
          containerSize={containerSize}
          garmentImage={garmentView.image}
          guide={guide}
          showGuide={showGuide}
          designSrc={designSrc}
          processedDesignSrc={processedDesignSrc}
          transform={transform}
          selected={selected}
          onSelect={() => setSelected(true)}
          onDeselect={() => setSelected(false)}
          onTransformChange={updateTransform}
          onDrop={handleDrop}
        />
      </div>
    </div>
  )
}
