// ─── Seletor de lista de arquivos do lote (frente/verso) ───────────────────
export default function BatchPicker({
  label,
  count,
  disabled,
  inputRef,
  onFiles,
}: {
  label: string
  count: number
  disabled: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onFiles: (files: FileList) => void
}) {
  return (
    <div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px',
          border: '1.5px dashed var(--border)',
          borderRadius: '10px',
          background: 'var(--surface2)',
          color: 'var(--text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
        }}
      >
        {count ? `🔄 ${label} (${count})` : `🗂 ${label}`}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length) onFiles(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
