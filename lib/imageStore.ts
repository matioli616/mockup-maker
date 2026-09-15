// Guarda as estampas (frente/verso, em base64) no IndexedDB em vez do
// localStorage. localStorage tem só ~5-10MB de cota por origem — com frente
// e verso guardando imagens independentes (em vez de uma só, compartilhada),
// duas imagens em base64 estouram essa cota fácil. IndexedDB não tem esse
// teto baixo, é feito pra guardar blob/string grande.
import type { ViewSide } from '@/types/mockup'

const DB_NAME = 'mockupdrop'
const DB_VERSION = 1
const STORE = 'designs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Falha (Safari em modo privado, quota, navegador antigo, etc.) só custa o
// autosave da imagem — o app continua funcionando, só não restaura ao reabrir.
export async function getDesign(key: ViewSide): Promise<string | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as string | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function setDesign(key: ViewSide, value: string | null): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      if (value === null) store.delete(key)
      else store.put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* indisponível — ignora, só perde o autosave dessa imagem */
  }
}
