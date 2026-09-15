import { describe, expect, it } from 'vitest'
import { centerWithPadding, containFit } from './geometry'

describe('containFit', () => {
  it('encolhe uma imagem larga pra caber na caixa mantendo proporção', () => {
    // imagem 2:1, caixa quadrada 100x100 → largura vira o limitante
    const { width, height } = containFit(100, 100, 200, 100)
    expect(width).toBe(100)
    expect(height).toBe(50)
  })

  it('encolhe uma imagem alta pra caber na caixa mantendo proporção', () => {
    // imagem 1:2, caixa quadrada 100x100 → altura vira o limitante
    const { width, height } = containFit(100, 100, 100, 200)
    expect(width).toBe(50)
    expect(height).toBe(100)
  })

  it('caixa e imagem com a mesma proporção preenche exatamente', () => {
    const { width, height } = containFit(200, 100, 400, 200)
    expect(width).toBe(200)
    expect(height).toBe(100)
  })

  it('sem dimensões naturais (imagem ainda não carregou), devolve a própria caixa', () => {
    expect(containFit(150, 80, 0, 0)).toEqual({ width: 150, height: 80 })
  })
})

describe('centerWithPadding', () => {
  it('escala o conteúdo pra preencher a área útil, centralizado (não é object-fit: contain sem upscale)', () => {
    // sem padding, conteúdo quadrado num frame quadrado maior → escala até preencher tudo
    const r = centerWithPadding(1000, 1000, 500, 500, 0)
    expect(r).toEqual({ x: 0, y: 0, width: 1000, height: 1000 })
  })

  it('aplica o padding proporcional ao frame nos dois eixos', () => {
    // frame 1000x1000, padding 10% = 100px de cada lado → área útil 800x800
    const r = centerWithPadding(1000, 1000, 800, 800, 0.1)
    expect(r.x).toBe(100)
    expect(r.y).toBe(100)
    expect(r.width).toBe(800)
    expect(r.height).toBe(800)
  })

  it('encolhe conteúdo maior que a área útil mantendo a proporção', () => {
    // conteúdo 720x1280 (9:16) dentro de um frame 1080x1350 (4:5) com 6% de padding
    const r = centerWithPadding(1080, 1350, 720, 1280, 0.06)
    // área útil: 1080 - 2*64.8(~65) ~ 950 de largura; altura disponível ~1220
    // a altura é o eixo limitante (720:1280 é mais "magro" que a área útil)
    expect(r.height).toBeLessThanOrEqual(1350)
    expect(r.width).toBeLessThanOrEqual(1080)
    // proporção preservada
    expect(r.width / r.height).toBeCloseTo(720 / 1280, 5)
    // fica centralizado: espaço sobrando igual dos dois lados
    expect(r.x).toBeCloseTo((1080 - r.width) / 2, 5)
    expect(r.y).toBeCloseTo((1350 - r.height) / 2, 5)
  })
})
