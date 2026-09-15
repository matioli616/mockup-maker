import { describe, expect, it } from 'vitest'
import { defaultTransformFor, GARMENT } from './garments'

describe('defaultTransformFor', () => {
  it('preenche a área de impressão da frente, escalada', () => {
    const t = defaultTransformFor(GARMENT, 'front', 1)
    const pa = GARMENT.front.printArea
    expect(t).toEqual({
      x: pa.x,
      y: pa.y,
      width: pa.width,
      height: pa.height,
      rotation: 0,
      opacity: 1,
      blendMode: 'source-over',
    })
  })

  it('aplica a escala do container em todas as dimensões', () => {
    const scale = 0.5
    const t = defaultTransformFor(GARMENT, 'back', scale)
    const pa = GARMENT.back.printArea
    expect(t.x).toBe(pa.x * scale)
    expect(t.y).toBe(pa.y * scale)
    expect(t.width).toBe(pa.width * scale)
    expect(t.height).toBe(pa.height * scale)
  })

  it('frente e verso usam áreas de impressão diferentes', () => {
    const front = defaultTransformFor(GARMENT, 'front', 1)
    const back = defaultTransformFor(GARMENT, 'back', 1)
    expect(front).not.toEqual(back)
  })
})
