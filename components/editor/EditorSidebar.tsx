import type { RefObject } from 'react'
import BatchPicker from '@/components/editor/BatchPicker'
import Slider from '@/components/editor/Slider'
import { BLEND_MODES } from '@/lib/garments'
import type { KnockoutOptions } from '@/lib/imageProcessing'
import { EXPORT_FORMATS, type ExportFormat } from '@/lib/export'
import type { DesignTransform, ViewSide } from '@/types/mockup'

const SECTION_LABEL_STYLE = {
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
  margin: '0 0 10px 0',
} as const

const DIVIDER = <div style={{ height: '1px', background: 'var(--border)' }} />

export interface CsvFields {
  vendor: string
  type: string
  tags: string
  price: string
  qty: string
}

// ─── Sidebar do editor: upload de estampa, lote pareado + CSV Shopify, e
// os controles de posição/tamanho/ajustes/blend do lado ativo ──────────────
export default function EditorSidebar({
  view,
  designSrc,
  fileInputRef,
  onFileChange,
  onUploadClick,
  onRemoveDesign,

  batchFront,
  batchBack,
  batchFrontInputRef,
  batchBackInputRef,
  batchExporting,
  batchProgress,
  batchTotal,
  batchReady,
  onBatchFiles,
  onClearBatch,
  onRunBatchExport,

  csv,
  onCsvChange,
  onDownloadCsv,

  transform,
  containerSize,
  scale,
  onUpdateTransform,

  realism,
  onRealismChange,
  knockout,
  onKnockoutChange,
  showGuide,
  onShowGuideChange,
  onResetPosition,
}: {
  view: ViewSide
  designSrc: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileChange: (file: File) => void
  onUploadClick: () => void
  onRemoveDesign: () => void

  batchFront: File[]
  batchBack: File[]
  batchFrontInputRef: RefObject<HTMLInputElement | null>
  batchBackInputRef: RefObject<HTMLInputElement | null>
  batchExporting: boolean
  batchProgress: { done: number; total: number } | null
  batchTotal: number
  batchReady: boolean
  onBatchFiles: (targetView: ViewSide, files: FileList) => void
  onClearBatch: () => void
  onRunBatchExport: (format: ExportFormat) => void

  csv: CsvFields
  onCsvChange: (field: keyof CsvFields, value: string) => void
  onDownloadCsv: () => void

  transform: DesignTransform | null
  containerSize: { w: number; h: number }
  scale: number
  onUpdateTransform: (patch: Partial<DesignTransform>) => void

  realism: boolean
  onRealismChange: (v: boolean) => void
  knockout: KnockoutOptions
  onKnockoutChange: (k: KnockoutOptions) => void
  showGuide: boolean
  onShowGuideChange: (v: boolean) => void
  onResetPosition: () => void
}) {
  return (
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
        <p style={SECTION_LABEL_STYLE}>ESTAMPA — {view === 'front' ? 'FRENTE' : 'VERSO'}</p>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
          Vale só pra este lado — {view === 'front' ? 'o verso' : 'a frente'} tem a própria
          estampa, independente.
        </p>
        <button
          onClick={onUploadClick}
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
          {designSrc
            ? `🔄 Trocar estampa (${view === 'front' ? 'frente' : 'verso'})`
            : `⬆ Upload PNG / SVG (${view === 'front' ? 'frente' : 'verso'})`}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFileChange(file)
            e.target.value = ''
          }}
        />
        {designSrc && (
          <button
            onClick={onRemoveDesign}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '9px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            🗑 Remover estampa ({view === 'front' ? 'frente' : 'verso'})
          </button>
        )}
      </div>

      {/* Lote pareado: 2 listas (frente/verso), combinadas pela ordem */}
      <div>
        <p style={SECTION_LABEL_STYLE}>LOTE PAREADO (FRENTE + VERSO)</p>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
          Seleciona uma lista de imagens pra frente e outra pro verso — a 1ª de cada vira o produto
          001, a 2ª o 002, etc. As listas podem ter quantidades diferentes: o que faltar de um lado
          sai só com o outro.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <BatchPicker
            label="Lote — Frente"
            count={batchFront.length}
            disabled={batchExporting}
            inputRef={batchFrontInputRef}
            onFiles={(files) => onBatchFiles('front', files)}
          />
          <BatchPicker
            label="Lote — Verso"
            count={batchBack.length}
            disabled={batchExporting}
            inputRef={batchBackInputRef}
            onFiles={(files) => onBatchFiles('back', files)}
          />
        </div>

        {(batchFront.length > 0 || batchBack.length > 0) && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {batchFront.length !== batchBack.length && (
              <p style={{ fontSize: '0.7rem', color: '#ffcf8a', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                Frente tem {batchFront.length}, verso tem {batchBack.length}. Os {Math.abs(batchFront.length - batchBack.length)}{' '}
                produto(s) a mais em {batchFront.length > batchBack.length ? 'frente' : 'verso'} saem sem o outro lado.
              </p>
            )}
            {batchReady && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {batchTotal} produto(s) prontos — a 1ª imagem de cada lista já está no canvas.
                Ajuste a posição na frente <b style={{ color: 'var(--text)' }}>e</b> no verso
                (troca de lado acima) e gere o lote: sai frente e/ou verso de cada produto, numeradas
                (001-frente.png, 001-verso.png...).
              </p>
            )}

            {batchExporting ? (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px 0' }}>
                  Gerando {batchProgress?.done ?? 0}/{batchProgress?.total ?? batchTotal}...
                </p>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round(
                        ((batchProgress?.done ?? 0) / (batchProgress?.total || batchTotal)) * 100,
                      )}%`,
                      background: 'var(--accent)',
                      transition: 'width 150ms linear',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => onRunBatchExport(f.value)}
                    disabled={!batchReady}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: batchReady ? 'var(--surface2)' : 'transparent',
                      color: batchReady ? 'var(--text)' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: batchReady ? 'pointer' : 'not-allowed',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textAlign: 'left',
                    }}
                  >
                    🗂 Gerar lote (.zip) — {f.label}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={onClearBatch}
              disabled={batchExporting}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: batchExporting ? 'not-allowed' : 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              Limpar lote
            </button>
          </div>
        )}

        {/* CSV de importação do Shopify — só metadados, sem imagem */}
        {batchReady && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DIVIDER}
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', margin: 0 }}>
              CSV SHOPIFY ({batchTotal} produtos)
            </p>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Cria os produtos em rascunho (Configurações → Importar produtos). Imagem não vai no
              CSV — depois de importar, arraste os PNGs do .zip pra cada produto (número bate:
              estampa-001 ↔ 001-frente.png).
            </p>
            {(
              [
                ['Marca', 'vendor'],
                ['Tipo', 'type'],
                ['Tags (separadas por vírgula)', 'tags'],
                ['Preço', 'price'],
                ['Estoque por produto', 'qty'],
              ] as const
            ).map(([label, field]) => (
              <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                <input
                  type="text"
                  value={csv[field]}
                  onChange={(e) => onCsvChange(field, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    fontSize: '0.78rem',
                  }}
                />
              </label>
            ))}
            <button
              onClick={onDownloadCsv}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--surface2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              ⬇ Baixar CSV Shopify
            </button>
          </div>
        )}
      </div>

      {/* Controls (only when design is loaded) */}
      {transform && (
        <>
          {DIVIDER}

          {/* Position */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ ...SECTION_LABEL_STYLE, margin: 0 }}>POSIÇÃO</p>
            <Slider
              label="X"
              value={Math.round(transform.x)}
              min={-200}
              max={containerSize.w}
              onChange={(v) => onUpdateTransform({ x: v })}
            />
            <Slider
              label="Y"
              value={Math.round(transform.y)}
              min={-200}
              max={containerSize.h}
              onChange={(v) => onUpdateTransform({ y: v })}
            />
          </div>

          {DIVIDER}

          {/* Size */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ ...SECTION_LABEL_STYLE, margin: 0 }}>TAMANHO</p>
            <Slider
              label="Largura"
              value={Math.round(transform.width)}
              min={20}
              max={containerSize.w}
              onChange={(v) => onUpdateTransform({ width: v })}
              display={`${Math.round(transform.width)}px`}
            />
            <Slider
              label="Altura"
              value={Math.round(transform.height)}
              min={20}
              max={containerSize.h}
              onChange={(v) => onUpdateTransform({ height: v })}
              display={`${Math.round(transform.height)}px`}
            />
            {scale > 0 && (
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Coordenada na imagem (720×1280):{' '}
                <b style={{ color: 'var(--text)' }}>
                  x={Math.round(transform.x / scale)} y={Math.round(transform.y / scale)} w=
                  {Math.round(transform.width / scale)} h={Math.round(transform.height / scale)}
                </b>
              </p>
            )}
          </div>

          {DIVIDER}

          {/* Transform */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ ...SECTION_LABEL_STYLE, margin: 0 }}>AJUSTES</p>
            <Slider
              label="Rotação"
              value={transform.rotation}
              min={-180}
              max={180}
              display={`${transform.rotation}°`}
              onChange={(v) => onUpdateTransform({ rotation: v })}
            />
            <Slider
              label="Opacidade"
              value={Math.round(transform.opacity * 100)}
              min={0}
              max={100}
              display={`${Math.round(transform.opacity * 100)}%`}
              onChange={(v) => onUpdateTransform({ opacity: v / 100 })}
            />
          </div>

          {DIVIDER}

          {/* Blend Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ ...SECTION_LABEL_STYLE, margin: 0 }}>BLEND MODE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {BLEND_MODES.map((bm) => (
                <button
                  key={bm.value}
                  onClick={() => onUpdateTransform({ blendMode: bm.value })}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: transform.blendMode === bm.value ? 'var(--accent)' : 'var(--border)',
                    background: transform.blendMode === bm.value ? 'var(--accent-dim)' : 'transparent',
                    color: transform.blendMode === bm.value ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {bm.label}
                </button>
              ))}
            </div>
          </div>

          {DIVIDER}

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
              onChange={(e) => onRealismChange(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }}
            />
            Realismo (dobras do tecido no export)
          </label>

          {DIVIDER}

          {/* Knockout de preto */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                checked={knockout.enabled}
                onChange={(e) => onKnockoutChange({ ...knockout, enabled: e.target.checked })}
                style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }}
              />
              Remover preto (usa o preto da blusa)
            </label>
            {knockout.enabled && (
              <>
                <Slider
                  label="Sensibilidade"
                  value={knockout.threshold}
                  min={0}
                  max={150}
                  onChange={(v) => onKnockoutChange({ ...knockout, threshold: v })}
                />
                <Slider
                  label="Suavidade"
                  value={knockout.feather}
                  min={5}
                  max={150}
                  onChange={(v) => onKnockoutChange({ ...knockout, feather: v })}
                />
              </>
            )}
          </div>

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
              onChange={(e) => onShowGuideChange(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }}
            />
            Mostrar área de impressão
          </label>

          {/* Reset */}
          <button
            onClick={onResetPosition}
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
          <p style={{ fontSize: '0.68rem', lineHeight: 1.7, color: 'var(--text-muted)', margin: 0 }}>
            <b style={{ color: 'var(--text)' }}>Atalhos:</b> setas movem 1px ·
            Shift+setas 10px · <b style={{ color: 'var(--text)' }}>R</b> reseta ·{' '}
            <b style={{ color: 'var(--text)' }}>F</b> frente/verso ·{' '}
            <b style={{ color: 'var(--text)' }}>Del</b> remove ·{' '}
            <b style={{ color: 'var(--text)' }}>Esc</b> desseleciona
          </p>
        </>
      )}
    </aside>
  )
}
