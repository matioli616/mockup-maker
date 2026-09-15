import Link from 'next/link'
import type { RefObject } from 'react'
import BloodLogo from '@/components/BloodLogo'
import { EXPORT_FORMATS, type ExportFormat } from '@/lib/export'
import type { ViewSide } from '@/types/mockup'

// ─── Top bar: logo, alternância frente/verso e menu de export ──────────────
export default function EditorHeader({
  view,
  onViewChange,
  designSrc,
  exporting,
  menuOpen,
  onToggleMenu,
  exportWrapRef,
  onExport,
}: {
  view: ViewSide
  onViewChange: (v: ViewSide) => void
  designSrc: string | null
  exporting: boolean
  menuOpen: boolean
  onToggleMenu: () => void
  exportWrapRef: RefObject<HTMLDivElement | null>
  onExport: (format: ExportFormat) => void
}) {
  return (
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
      <Link href="/" aria-label="SixOneSix Mockup Maker Express" style={{ lineHeight: 0 }}>
        <BloodLogo size="sm" tagline={false} />
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
            onClick={() => onViewChange(v)}
            style={{
              padding: '8px 20px',
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.06em',
              background: view === v ? 'var(--accent)' : 'transparent',
              color: view === v ? '#fff' : 'var(--text-muted)',
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
          onClick={() => designSrc && onToggleMenu()}
          disabled={!designSrc || exporting}
          style={{
            background: designSrc ? 'var(--accent)' : 'var(--border)',
            color: designSrc ? '#fff' : 'var(--text-muted)',
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
                onClick={() => onExport(f.value)}
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
  )
}
