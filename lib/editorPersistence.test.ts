import { describe, expect, it } from 'vitest'
import { DEFAULT_KNOCKOUT } from './imageProcessing'
import {
  parseStoredState,
  serializeState,
  toDisplayTransform,
  toPersistedTransform,
  type PersistedTransform,
} from './editorPersistence'

const T: PersistedTransform = {
  x: 10,
  y: 20,
  width: 100,
  height: 200,
  rotation: 15,
  opacity: 0.8,
  blendMode: 'multiply',
}

describe('parseStoredState — entradas inválidas', () => {
  it('devolve null quando não há nada salvo', () => {
    expect(parseStoredState(null, DEFAULT_KNOCKOUT)).toBeNull()
  })

  it('devolve null pra JSON inválido, sem lançar', () => {
    expect(parseStoredState('{isso não é json', DEFAULT_KNOCKOUT)).toBeNull()
  })

  it('devolve null quando o JSON é válido mas não é um objeto', () => {
    expect(parseStoredState('"uma string qualquer"', DEFAULT_KNOCKOUT)).toBeNull()
    expect(parseStoredState('42', DEFAULT_KNOCKOUT)).toBeNull()
  })
})

describe('parseStoredState — migração v1 (transform único + designSrc único)', () => {
  it('joga o transform salvo pro lado ativo quando view é "back"', () => {
    const raw = JSON.stringify({
      view: 'back',
      realism: true,
      designSrc: 'data:image/png;base64,AAA',
      transform: T,
    })
    const parsed = parseStoredState(raw, DEFAULT_KNOCKOUT)
    expect(parsed).not.toBeNull()
    expect(parsed!.view).toBe('back')
    expect(parsed!.realism).toBe(true)
    // v1 tinha uma única estampa — migra pros dois lados
    expect(parsed!.legacyDesigns).toEqual({ front: 'data:image/png;base64,AAA', back: 'data:image/png;base64,AAA' })
    expect(parsed!.transforms).toEqual({ front: null, back: T })
  })

  it('joga o transform salvo pra frente quando view não é "back" (default/ausente)', () => {
    const raw = JSON.stringify({ transform: T })
    const parsed = parseStoredState(raw, DEFAULT_KNOCKOUT)
    expect(parsed!.view).toBeNull()
    expect(parsed!.transforms).toEqual({ front: T, back: null })
  })
})

describe('parseStoredState — migração v2 (transforms por lado + designSrc único)', () => {
  it('mantém os dois transforms e migra a estampa única pros dois lados', () => {
    const raw = JSON.stringify({
      view: 'front',
      realism: false,
      designSrc: 'data:image/png;base64,X',
      transforms: { front: T, back: null },
    })
    const parsed = parseStoredState(raw, DEFAULT_KNOCKOUT)
    expect(parsed!.legacyDesigns).toEqual({ front: 'data:image/png;base64,X', back: 'data:image/png;base64,X' })
    expect(parsed!.transforms).toEqual({ front: T, back: null })
  })
})

describe('parseStoredState — v3/v4 (designSrcs independentes por lado)', () => {
  it('prefere designSrcs sobre designSrc quando os dois existem', () => {
    const raw = JSON.stringify({
      designSrc: 'data:ignorada',
      designSrcs: { front: 'data:A', back: 'data:B' },
      transforms: { front: T, back: null },
    })
    const parsed = parseStoredState(raw, DEFAULT_KNOCKOUT)
    expect(parsed!.legacyDesigns).toEqual({ front: 'data:A', back: 'data:B' })
  })

  it('v4 atual não tem imagem nenhuma salva — legacyDesigns fica null', () => {
    const raw = JSON.stringify({
      v: 4,
      view: 'back',
      realism: true,
      knockout: { enabled: true, threshold: 30, feather: 20 },
      transforms: { front: null, back: T },
    })
    const parsed = parseStoredState(raw, DEFAULT_KNOCKOUT)
    expect(parsed!.legacyDesigns).toBeNull()
    expect(parsed!.knockout).toEqual({ enabled: true, threshold: 30, feather: 20 })
    expect(parsed!.transforms).toEqual({ front: null, back: T })
  })
})

describe('parseStoredState — knockout parcial/corrompido', () => {
  it('preenche threshold/feather ausentes com o default informado', () => {
    const raw = JSON.stringify({ knockout: { enabled: true } })
    const parsed = parseStoredState(raw, DEFAULT_KNOCKOUT)
    expect(parsed!.knockout).toEqual({
      enabled: true,
      threshold: DEFAULT_KNOCKOUT.threshold,
      feather: DEFAULT_KNOCKOUT.feather,
    })
  })

  it('sem chave knockout, devolve knockout null (não inventa um default)', () => {
    const raw = JSON.stringify({ view: 'front' })
    const parsed = parseStoredState(raw, DEFAULT_KNOCKOUT)
    expect(parsed!.knockout).toBeNull()
  })
})

describe('conversão de escala (display px ↔ coordenada da imagem)', () => {
  it('toDisplayTransform multiplica todas as dimensões pela escala', () => {
    const d = toDisplayTransform(T, 2)
    expect(d).toEqual({ x: 20, y: 40, width: 200, height: 400, rotation: 15, opacity: 0.8, blendMode: 'multiply' })
  })

  it('toPersistedTransform é o inverso de toDisplayTransform', () => {
    const scale = 0.75
    const display = toDisplayTransform(T, scale)!
    const back = toPersistedTransform(display, scale)!
    expect(back.x).toBeCloseTo(T.x, 10)
    expect(back.y).toBeCloseTo(T.y, 10)
    expect(back.width).toBeCloseTo(T.width, 10)
    expect(back.height).toBeCloseTo(T.height, 10)
    expect(back.rotation).toBe(T.rotation)
    expect(back.opacity).toBe(T.opacity)
    expect(back.blendMode).toBe(T.blendMode)
  })

  it('null entra, null sai, nos dois sentidos', () => {
    expect(toDisplayTransform(null, 2)).toBeNull()
    expect(toPersistedTransform(null, 2)).toBeNull()
  })
})

describe('serializeState', () => {
  it('produz um payload v4 sem nenhum campo de imagem', () => {
    const json = serializeState({
      view: 'back',
      realism: true,
      knockout: DEFAULT_KNOCKOUT,
      transforms: { front: null, back: toDisplayTransform(T, 2) },
      scale: 2,
    })
    const parsed = JSON.parse(json)
    expect(parsed.v).toBe(4)
    expect(parsed).not.toHaveProperty('designSrc')
    expect(parsed).not.toHaveProperty('designSrcs')
    expect(parsed.view).toBe('back')
    expect(parsed.transforms.back).toEqual(T)
  })

  it('faz round-trip: serializar e reler com parseStoredState devolve o mesmo estado', () => {
    const scale = 1.5
    const original = {
      view: 'front' as const,
      realism: false,
      knockout: { enabled: true, threshold: 33, feather: 44 },
      transforms: { front: toDisplayTransform(T, scale), back: null },
      scale,
    }
    const json = serializeState(original)
    const parsed = parseStoredState(json, DEFAULT_KNOCKOUT)
    expect(parsed!.view).toBe('front')
    expect(parsed!.realism).toBe(false)
    expect(parsed!.knockout).toEqual(original.knockout)
    expect(parsed!.legacyDesigns).toBeNull()
    expect(toDisplayTransform(parsed!.transforms!.front, scale)).toEqual(original.transforms.front)
  })
})
