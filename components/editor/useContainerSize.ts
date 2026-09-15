import { useEffect, useState, type RefObject } from 'react'

// ─── Mede o container (mantém aspect ratio 720:1280 = 9:16) ────────────────
// Mede a partir do <main> (sempre montado) — a peça em si só é renderizada
// depois que containerSize existe, então não dá pra medir a partir dela.
export function useContainerSize(mainRef: RefObject<HTMLElement | null>) {
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function measure() {
      const parent = mainRef.current
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mainRef é estável (ref)
  }, [])

  return { containerSize, scale }
}
