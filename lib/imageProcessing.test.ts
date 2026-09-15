import { describe, expect, it } from 'vitest'
import { alphaMultiplierForLuminance } from './imageProcessing'

describe('alphaMultiplierForLuminance', () => {
  it('é totalmente transparente (0) abaixo do threshold', () => {
    expect(alphaMultiplierForLuminance(10, 40, 50)).toBe(0)
    expect(alphaMultiplierForLuminance(40, 40, 50)).toBe(0) // igual ao threshold ainda conta como abaixo
  })

  it('é totalmente opaco (1) a partir de threshold + feather', () => {
    expect(alphaMultiplierForLuminance(90, 40, 50)).toBe(1)
    expect(alphaMultiplierForLuminance(255, 40, 50)).toBe(1)
  })

  it('faz uma rampa linear na faixa de transição', () => {
    // threshold=40, feather=50 → rampa entre 40 e 90; no meio (65) = 0.5
    expect(alphaMultiplierForLuminance(65, 40, 50)).toBeCloseTo(0.5, 5)
    expect(alphaMultiplierForLuminance(52.5, 40, 50)).toBeCloseTo(0.25, 5)
  })

  it('nunca deixa threshold negativo nem feather zerado/negativo derrubar a curva', () => {
    // threshold negativo é tratado como 0; feather <=0 vira no mínimo 1
    expect(alphaMultiplierForLuminance(-5, -10, -5)).toBe(0)
    expect(alphaMultiplierForLuminance(0, 0, 0)).toBe(0)
    expect(alphaMultiplierForLuminance(1, 0, 0)).toBe(1)
  })
})
