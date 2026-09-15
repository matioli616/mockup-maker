import type { RefObject } from 'react'
import { Rnd } from 'react-rnd'
import type { DesignTransform } from '@/types/mockup'

interface Guide {
  x: number
  y: number
  width: number
  height: number
}

// ─── Área do canvas: peça, guia da área de impressão e a estampa arrastável/
// redimensionável (react-rnd) ────────────────────────────────────────────────
export default function EditorCanvas({
  mainRef,
  containerSize,
  garmentImage,
  guide,
  showGuide,
  designSrc,
  processedDesignSrc,
  transform,
  selected,
  onSelect,
  onDeselect,
  onTransformChange,
  onDrop,
}: {
  mainRef: RefObject<HTMLElement | null>
  containerSize: { w: number; h: number }
  garmentImage: string
  guide: Guide
  showGuide: boolean
  designSrc: string | null
  processedDesignSrc: string | null
  transform: DesignTransform | null
  selected: boolean
  onSelect: () => void
  onDeselect: () => void
  onTransformChange: (patch: Partial<DesignTransform>) => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <main
      ref={mainRef}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {containerSize.w > 0 && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onDeselect()
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
            src={garmentImage}
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
                left: guide.x,
                top: guide.y,
                width: guide.width,
                height: guide.height,
                border: '1.5px dashed var(--accent)',
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
              onDragStart={onSelect}
              onDragStop={(_, d) => onTransformChange({ x: d.x, y: d.y })}
              onResizeStop={(_, __, ref, ___, position) => {
                onTransformChange({
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
              onMouseDown={onSelect}
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
                  src={processedDesignSrc ?? designSrc}
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
                    border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--accent-dim)'}`,
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
                left: guide.x,
                top: guide.y,
                width: guide.width,
                height: guide.height,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--accent)',
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
  )
}
