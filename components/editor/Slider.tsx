// ─── Slider genérico (label + valor + <input type="range">) ────────────────
export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display?: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ color: 'var(--text)', fontWeight: 700 }}>{display ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
