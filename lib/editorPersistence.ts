// Lógica pura de (de)serialização do estado do editor salvo em
// localStorage — sem `localStorage`/DOM aqui, só parsing e matemática de
// escala, pra dar pra testar com strings/objetos direto. Quem chama
// (MockupEditor) fica só com o efeito colateral (ler/escrever a chave).
//
// Histórico de formato (todos migrados pro atual na leitura):
//   v1 — um único `transform` (pertencia ao lado ativo) + `designSrc` único
//   v2 — `transforms.{front,back}` + `designSrc` único (mesma estampa pros 2 lados)
//   v3 — `designSrcs.{front,back}` (estampas independentes), tudo ainda no localStorage
//   v4 — igual v3, mas as imagens saem daqui e vão pro IndexedDB (lib/imageStore.ts)
import type { KnockoutOptions } from '@/lib/imageProcessing'
import type { BlendModeOption, DesignTransform, ViewSide } from '@/types/mockup'

export const STORAGE_KEY = 'mockupdrop_state'

export interface PersistedTransform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  blendMode: BlendModeOption
}

export interface PersistedTransforms {
  front: PersistedTransform | null
  back: PersistedTransform | null
}

export interface PersistedDesignSrcs {
  front: string | null
  back: string | null
}

export interface PersistedStateV4 {
  v: 4
  view: ViewSide
  realism: boolean
  knockout: KnockoutOptions
  transforms: PersistedTransforms
}

// Forma solta de qualquer versão já gravada (v1-v4) — usada só na leitura.
interface StoredShape {
  v?: number
  view?: unknown
  realism?: unknown
  knockout?: Partial<KnockoutOptions>
  designSrc?: unknown // v1/v2
  designSrcs?: Partial<PersistedDesignSrcs> // v3/v4
  transform?: PersistedTransform | null // v1
  transforms?: Partial<PersistedTransforms> // v2+
}

export interface ParsedStoredState {
  view: ViewSide | null
  realism: boolean | null
  knockout: KnockoutOptions | null
  // null = nada salvo pra estampa; presente = precisa migrar pro IndexedDB
  // (só existe em formatos < v4 — v4 nunca guarda imagem aqui)
  legacyDesigns: PersistedDesignSrcs | null
  transforms: PersistedTransforms | null
}

function isViewSide(v: unknown): v is ViewSide {
  return v === 'front' || v === 'back'
}

// Faz o parse + migração de um payload cru do localStorage (string ou já
// null se a chave não existir). Retorna `null` só quando não há nada
// aproveitável (chave vazia, JSON inválido, ou não é um objeto).
export function parseStoredState(raw: string | null, defaultKnockout: KnockoutOptions): ParsedStoredState | null {
  if (!raw) return null
  let p: StoredShape
  try {
    p = JSON.parse(raw) as StoredShape
  } catch {
    return null
  }
  if (!p || typeof p !== 'object') return null

  const view = isViewSide(p.view) ? p.view : null
  const realism = typeof p.realism === 'boolean' ? p.realism : null

  let knockout: KnockoutOptions | null = null
  if (p.knockout && typeof p.knockout === 'object') {
    const k = p.knockout
    knockout = {
      enabled: !!k.enabled,
      threshold: typeof k.threshold === 'number' ? k.threshold : defaultKnockout.threshold,
      feather: typeof k.feather === 'number' ? k.feather : defaultKnockout.feather,
    }
  }

  let legacyDesigns: PersistedDesignSrcs | null = null
  if (p.designSrcs && typeof p.designSrcs === 'object') {
    legacyDesigns = { front: p.designSrcs.front ?? null, back: p.designSrcs.back ?? null }
  } else if (typeof p.designSrc === 'string') {
    // migração v1/v2 → v3: a mesma estampa salva valia pros dois lados
    legacyDesigns = { front: p.designSrc, back: p.designSrc }
  }

  let transforms: PersistedTransforms | null = null
  if (p.transforms && typeof p.transforms === 'object') {
    transforms = { front: p.transforms.front ?? null, back: p.transforms.back ?? null }
  } else if (p.transform && typeof p.transform === 'object') {
    // migração v1 → v2: o único transform salvo pertencia ao lado ativo
    transforms = view === 'back' ? { front: null, back: p.transform } : { front: p.transform, back: null }
  }

  return { view, realism, knockout, legacyDesigns, transforms }
}

// Monta o payload v4 (sem imagem) pronto pra `JSON.stringify` + gravar.
export function serializeState(state: {
  view: ViewSide
  realism: boolean
  knockout: KnockoutOptions
  transforms: Record<ViewSide, DesignTransform | null>
  scale: number
}): string {
  const payload: PersistedStateV4 = {
    v: 4,
    view: state.view,
    realism: state.realism,
    knockout: state.knockout,
    transforms: {
      front: toPersistedTransform(state.transforms.front, state.scale),
      back: toPersistedTransform(state.transforms.back, state.scale),
    },
  }
  return JSON.stringify(payload)
}

// Persistido guarda coordenadas "da imagem" (720×1280, independente de
// viewport) — converte pra px de display multiplicando pela escala atual do
// container, e vice-versa ao salvar.
export function toDisplayTransform(p: PersistedTransform | null, scale: number): DesignTransform | null {
  if (!p) return null
  return {
    x: p.x * scale,
    y: p.y * scale,
    width: p.width * scale,
    height: p.height * scale,
    rotation: typeof p.rotation === 'number' ? p.rotation : 0,
    opacity: typeof p.opacity === 'number' ? p.opacity : 1,
    blendMode: p.blendMode ?? 'source-over',
  }
}

export function toPersistedTransform(t: DesignTransform | null, scale: number): PersistedTransform | null {
  if (!t) return null
  return {
    x: t.x / scale,
    y: t.y / scale,
    width: t.width / scale,
    height: t.height / scale,
    rotation: t.rotation,
    opacity: t.opacity,
    blendMode: t.blendMode,
  }
}
