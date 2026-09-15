import { useEffect } from 'react'

// ─── Atalhos de teclado do editor ───────────────────────────────────────────
// ↑↓←→ move 1px (Shift = 10px) · Delete/Backspace remove · R reseta posição ·
// F alterna frente/verso · Esc desseleciona. Ignorado dentro de campo de
// formulário (input/textarea/select) e quando algum modificador (Cmd/Ctrl/
// Alt) está pressionado, pra não brigar com atalhos do browser/SO.
export function useKeyboardShortcuts(opts: {
  designSrc: string | null
  selected: boolean
  onNudge: (dx: number, dy: number) => void
  onRemove: () => void
  onResetPosition: () => void
  onToggleView: () => void
  onDeselect: () => void
}) {
  const { designSrc, selected, onNudge, onRemove, onResetPosition, onToggleView, onDeselect } = opts

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement as HTMLElement | null
      const tag = el?.tagName
      const inForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          if (inForm || !designSrc || !selected) return
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          onNudge(dx, dy)
          break
        }
        case 'Delete':
        case 'Backspace': {
          if (inForm || !designSrc) return
          e.preventDefault()
          onRemove()
          break
        }
        case 'r':
        case 'R': {
          if (inForm) return
          e.preventDefault()
          onResetPosition()
          break
        }
        case 'f':
        case 'F': {
          if (inForm) return
          e.preventDefault()
          onToggleView()
          break
        }
        case 'Escape': {
          onDeselect()
          el?.blur()
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [designSrc, selected, onNudge, onRemove, onResetPosition, onToggleView, onDeselect])
}
