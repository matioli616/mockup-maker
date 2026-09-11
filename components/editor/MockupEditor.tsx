'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Rnd } from 'react-rnd'
import { exportMockup, type ExportFormat } from '@/lib/export'
import type { BlendModeOption, DesignTransform, GarmentConfig, ViewSide } from '@/types/mockup'

// ─── Garment config (inline para MVP) ────────────────────────────────────────
const GARMENT: GarmentConfig = {
  name: 'Oversized Tee',
  front: {
    image: '/garments/tshirt-front.jpg',
    imageWidth: 720,
    imageHeight: 1280,
    printArea: { x: 185, y: 300, width: 350, height: 550 },
  },
  back: {
    image: '/garments/tshirt-back.jpg',
    imageWidth: 720,
    imageHeight: 1280,
    printArea: { x: 175, y: 280, width: 370, height: 590 },
  },
}

const BLEND_MODES: { label: string; value: BlendModeOption }[] = [
  { label: 'Normal', value: 'source-over' },
  { label: 'Screen', value: 'screen' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Multiply', value: 'multiply' },
]

const EXPORT_FORMATS: { label: string; sub: string; value: ExportFormat }[] = [
  { label: 'PNG Original', sub: '720 × 1280', value: 'original' },
  { label: 'Feed Instagram', sub: '1080 × 1350 · 4:5', value: 'feed' },
  { label: 'Story Instagram', sub: '1080 × 1920 · 9:16', value: 'story' },
]

const STORAGE_KEY = 'mockupdrop_state'

// Estado persistido: transform em coordenadas da imagem (px / scale),
// pra sobreviver a mudança de viewport.
interface PersistedTransform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  blendMode: BlendModeOption
}
interface PersistedState {
  v: 1
  view: ViewSide
  realism: boolean
  designSrc: string | null
  transform: PersistedTransform | null
}

// ─── Slider component ─────────────────────────────────────────────────────────
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display?: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ color: 'var(--text)', fontWeight: 700 }}>{display ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
export default function MockupEditor() {
  const [view, setView] = useState<ViewSide>('front')
  const [designSrc, setDesignSrc] = useState<string | null>(null)
  const [transform, setTransform] = useState<DesignTransform | null>(null)
  const [showGuide, setShowGuide] = useState(true)
  const [realism, setRealism] = useState(false)
  const [selected, setSelected] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const [scale, setScale] = useState(1)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const exportWrapRef = useRef<HTMLDivElement>(null)
  // transform restaurado do localStorage (coords de imagem), aplicado quando o scale existir
  const restoredRef = useRef<PersistedTransform | null>(null)

  // ─── Hidratação: restaura o último estado ──────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Partial<PersistedState>
        if (p && typeof p === 'object') {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata estado de fonte externa (localStorage), roda uma única vez no mount
          if (p.view === 'front' || p.view === 'back') setView(p.view)
          if (typeof p.realism === 'boolean') setRealism(p.realism)
          if (typeof p.designSrc === 'string') setDesignSrc(p.designSrc)
          if (p.transform && typeof p.transform === 'object') {
            restoredRef.current = p.transform as PersistedTransform
          }
        }
      }
    } catch {
      /* localStorage indisponível / JSON inválido — começa limpo */
    }
    setHydrated(true)
  }, [])

  // ─── Mede o container (mantém aspect ratio 720:1280 = 9:16) ────────────────
  useEffect(() => {
    function measure() {
      if (!containerRef.current) return
      const parent = containerRef.current.parentElement
      if (!parent) return
      const maxW = Math.min(parent.clientWidth, 480)
      const maxH = window.innerHeight - 160
      let w = maxW
      let h = w * (1280 / 720)
      if (h > maxH) {
        h = maxH
        w = h * (720 / 1280)
      }
      setContainerSize({ w, h })
      setScale(w / 720)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // ─── Aplica o transform restaurado assim que o scale estiver disponível ────
  useEffect(() => {
    if (!hydrated || !scale) return
    const n = restoredRef.current
    if (n) {
      restoredRef.current = null
      setTransform({
        x: n.x * scale,
        y: n.y * scale,
        width: n.width * scale,
        height: n.height * scale,
        rotation: typeof n.rotation === 'number' ? n.rotation : 0,
        opacity: typeof n.opacity === 'number' ? n.opacity : 1,
        blendMode: n.blendMode ?? 'source-over',
      })
      setSelected(true)
      return
    }
    // designSrc restaurado sem transform (situação anômala) — cai no default
    setTransform((t) => {
      if (t) return t
      if (!designSrc) return t
      const pa = GARMENT[view].printArea
      return {
        x: pa.x * scale,
        y: pa.y * scale,
        width: pa.width * scale,
        height: pa.height * scale,
        rotation: 0,
        opacity: 1,
        blendMode: 'source-over',
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, scale])

  // ─── Persiste o estado a cada mudança relevante ───────────────────────────
  useEffect(() => {
    if (!hydrated || !scale) return
    try {
      const payload: PersistedState = {
        v: 1,
        view,
        realism,
        designSrc,
        transform: transform
          ? {
              x: transform.x / scale,
              y: transform.y / scale,
              width: transform.width / scale,
              height: transform.height / scale,
              rotation: transform.rotation,
              opacity: transform.opacity,
              blendMode: transform.blendMode,
            }
          : null,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* quota / indisponível — ignora */
    }
  }, [hydrated, scale, view, realism, designSrc, transform])

  // ─── Reposiciona a estampa na print area ao trocar de view ────────────────
  useEffect(() => {
    if (!transform || !scale) return
    const pa = GARMENT[view].printArea
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reposiciona ao trocar de view, dependente de `view` em si
    setTransform((t) =>
      t
        ? {
            ...t,
            x: pa.x * scale,
            y: pa.y * scale,
            width: pa.width * scale,
            height: pa.height * scale,
          }
        : t,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const updateTransform = useCallback((patch: Partial<DesignTransform>) => {
    setTransform((t) => (t ? { ...t, ...patch } : t))
  }, [])

  const resetPosition = useCallback(() => {
    if (!scale) return
    const pa = GARMENT[view].printArea
    setTransform({
      x: pa.x * scale,
      y: pa.y * scale,
      width: pa.width * scale,
      height: pa.height * scale,
      rotation: 0,
      opacity: 1,
      blendMode: 'source-over',
    })
    setSelected(true)
  }, [view, scale])

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target?.result as string
        setDesignSrc(src)
        const pa = GARMENT[view].printArea
        const s = scale || 1
        setTransform({
          x: pa.x * s,
          y: pa.y * s,
          width: pa.width * s,
          height: pa.height * s,
          rotation: 0,
          opacity: 1,
          blendMode: 'source-over',
        })
        setSelected(true)
      }
      reader.readAsDataURL(file)
    },
    [view, scale],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  const removeDesign = useCallback(() => {
    setDesignSrc(null)
    setTransform(null)
    setSelected(false)
  }, [])

  // ─── Atalhos de teclado ───────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement as HTMLElement | null
      const tag = el?.tagName
      const inForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          if (inForm || !designSrc || !selected) return
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          setTransform((t) => (t ? { ...t, x: t.x + dx, y: t.y + dy } : t))
          break
        }
        case 'Delete':
        case 'Backspace': {
          if (inForm || !designSrc) return
          e.preventDefault()
          removeDesign()
          break
        }
        case 'r':
        case 'R': {
          if (inForm) return
          e.preventDefault()
          resetPosition()
          break
        }
        case 'f':
        case 'F': {
          if (inForm) return
          e.preventDefault()
          setView((v) => (v === 'front' ? 'back' : 'front'))
          break
        }
        case 'Escape': {
          setSelected(false)
          setMenuOpen(false)
          el?.blur()
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, designSrc, removeDesign, resetPosition])

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
          designSrc,
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
        })
      } finally {
        setExporting(false)
      }
    },
    [designSrc, transform, containerSize.w, containerSize.h, view, realism],
  )

  const garmentView = GARMENT[view]
  const printArea = garmentView.printArea

  const guideX = printArea.x * scale
  const guideY = printArea.y * scale
  const guideW = printArea.width * scale
  const guideH = printArea.height * scale

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top Bar ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 900,
            fontSize: '1.1rem',
            letterSpacing: '-0.02em',
            color: 'var(--accent)',
            textDecoration: 'none',
          }}
        >
          MOCKUPDROP
        </Link>

        {/* View Toggle */}
        <div
          style={{
            display: 'flex',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {(['front', 'back'] as ViewSide[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: '0.8rem',
                letterSpacing: '0.06em',
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? '#000' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {v === 'front' ? 'Frente' : 'Verso'}
            </button>
          ))}
        </div>

        {/* Export + menu de formatos */}
        <div ref={exportWrapRef} style={{ position: 'relative' }}>
          <button
            onClick={() => designSrc && setMenuOpen((o) => !o)}
            disabled={!designSrc || exporting}
            style={{
              background: designSrc ? 'var(--accent)' : 'var(--border)',
              color: designSrc ? '#000' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 800,
              fontSize: '0.85rem',
              letterSpacing: '0.04em',
              cursor: designSrc ? 'pointer' : 'not-allowed',
            }}
          >
            {exporting ? 'EXPORTANDO...' : '⬇ EXPORTAR ▾'}
          </button>

          {menuOpen && designSrc && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: '220px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 50,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              }}
            >
              {EXPORT_FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => runExport(f.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{f.label}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: '0',
          overflow: 'hidden',
        }}
      >
        {/* ── Sidebar ── */}
        <aside
          style={{
            width: '260px',
            minWidth: '220px',
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            overflowY: 'auto',
          }}
        >
          {/* Upload */}
          <div>
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                margin: '0 0 10px 0',
              }}
            >
              ESTAMPA
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '14px',
                border: '1.5px dashed var(--border)',
                borderRadius: '10px',
                background: 'var(--surface2)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              {designSrc ? '🔄 Trocar estampa' : '⬆ Upload PNG / SVG'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
                e.target.value = ''
              }}
            />
          </div>

          {/* Controls (only when design is loaded) */}
          {transform && (
            <>
              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Position */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  POSIÇÃO
                </p>
                <Slider
                  label="X"
                  value={Math.round(transform.x)}
                  min={-200}
                  max={containerSize.w}
                  onChange={(v) => updateTransform({ x: v })}
                />
                <Slider
                  label="Y"
                  value={Math.round(transform.y)}
                  min={-200}
                  max={containerSize.h}
                  onChange={(v) => updateTransform({ y: v })}
                />
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Size */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  TAMANHO
                </p>
                <Slider
                  label="Largura"
                  value={Math.round(transform.width)}
                  min={20}
                  max={containerSize.w}
                  onChange={(v) => updateTransform({ width: v })}
                  display={`${Math.round(transform.width)}px`}
                />
                <Slider
                  label="Altura"
                  value={Math.round(transform.height)}
                  min={20}
                  max={containerSize.h}
                  onChange={(v) => updateTransform({ height: v })}
                  display={`${Math.round(transform.height)}px`}
                />
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Transform */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  AJUSTES
                </p>
                <Slider
                  label="Rotação"
                  value={transform.rotation}
                  min={-180}
                  max={180}
                  display={`${transform.rotation}°`}
                  onChange={(v) => updateTransform({ rotation: v })}
                />
                <Slider
                  label="Opacidade"
                  value={Math.round(transform.opacity * 100)}
                  min={0}
                  max={100}
                  display={`${Math.round(transform.opacity * 100)}%`}
                  onChange={(v) => updateTransform({ opacity: v / 100 })}
                />
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Blend Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  BLEND MODE
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {BLEND_MODES.map((bm) => (
                    <button
                      key={bm.value}
                      onClick={() => updateTransform({ blendMode: bm.value })}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '5px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor:
                          transform.blendMode === bm.value ? 'var(--accent)' : 'var(--border)',
                        background:
                          transform.blendMode === bm.value ? 'var(--accent-dim)' : 'transparent',
                        color:
                          transform.blendMode === bm.value ? 'var(--accent)' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {bm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Realismo */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={realism}
                  onChange={(e) => setRealism(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }}
                />
                Realismo (dobras do tecido no export)
              </label>

              {/* Guide Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={showGuide}
                  onChange={(e) => setShowGuide(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }}
                />
                Mostrar área de impressão
              </label>

              {/* Reset */}
              <button
                onClick={resetPosition}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                RESETAR POSIÇÃO
              </button>

              {/* Atalhos */}
              <p
                style={{
                  fontSize: '0.68rem',
                  lineHeight: 1.7,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                <b style={{ color: 'var(--text)' }}>Atalhos:</b> setas movem 1px ·
                Shift+setas 10px · <b style={{ color: 'var(--text)' }}>R</b> reseta ·{' '}
                <b style={{ color: 'var(--text)' }}>F</b> frente/verso ·{' '}
                <b style={{ color: 'var(--text)' }}>Del</b> remove ·{' '}
                <b style={{ color: 'var(--text)' }}>Esc</b> desseleciona
              </p>
            </>
          )}
        </aside>

        {/* ── Canvas Area ── */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'var(--bg)',
            overflow: 'hidden',
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {containerSize.w > 0 && (
            <div
              ref={containerRef}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setSelected(false)
              }}
              style={{
                width: containerSize.w,
                height: containerSize.h,
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 0 0 1px var(--border), 0 24px 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* Shirt image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={garmentView.image}
                alt="Camiseta"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
                draggable={false}
              />

              {/* Print area guide */}
              {showGuide && (
                <div
                  style={{
                    position: 'absolute',
                    left: guideX,
                    top: guideY,
                    width: guideW,
                    height: guideH,
                    border: '1.5px dashed rgba(200,255,0,0.45)',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '-22px',
                      left: 0,
                      fontSize: '10px',
                      color: 'var(--accent)',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                    }}
                  >
                    ÁREA DE IMPRESSÃO
                  </span>
                </div>
              )}

              {/* Design overlay — draggable + resizable */}
              {designSrc && transform && (
                <Rnd
                  position={{ x: transform.x, y: transform.y }}
                  size={{ width: transform.width, height: transform.height }}
                  onDragStart={() => setSelected(true)}
                  onDragStop={(_, d) => updateTransform({ x: d.x, y: d.y })}
                  onResizeStop={(_, __, ref, ___, position) => {
                    updateTransform({
                      width: ref.offsetWidth,
                      height: ref.offsetHeight,
                      x: position.x,
                      y: position.y,
                    })
                  }}
                  bounds="parent"
                  // Alças de resize só aparecem sem rotação, onde ficam alinhadas.
                  // Com rotação, o box inteiro gira junto com a arte (fix visual).
                  enableResizing={transform.rotation === 0}
                  onMouseDown={() => setSelected(true)}
                  style={{ zIndex: 10 }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      transform: `rotate(${transform.rotation}deg)`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={designSrc}
                      alt="Estampa"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: transform.opacity,
                        mixBlendMode: transform.blendMode as React.CSSProperties['mixBlendMode'],
                        display: 'block',
                        userSelect: 'none',
                        pointerEvents: 'none',
                      }}
                      draggable={false}
                    />
                    {/* Selection frame */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        border: `1.5px solid ${
                          selected ? 'rgba(200,255,0,0.6)' : 'rgba(200,255,0,0.15)'
                        }`,
                        borderRadius: '2px',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                </Rnd>
              )}

              {/* Drop zone hint when no design */}
              {!designSrc && (
                <div
                  style={{
                    position: 'absolute',
                    left: guideX,
                    top: guideY,
                    width: guideW,
                    height: guideH,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: 'rgba(200,255,0,0.6)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>⬆</span>
                  <span>
                    ARRASTA A ESTAMPA
                    <br />
                    OU CLICA NO UPLOAD
                  </span>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
