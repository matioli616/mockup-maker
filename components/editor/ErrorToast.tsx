// ─── Toast de erro (upload, processamento, export) — antes falhavam em silêncio ──
export default function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '90vw',
        background: '#2a0e0e',
        border: '1px solid #7a2323',
        color: '#ffb4b4',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '0.8rem',
        fontWeight: 600,
        lineHeight: 1.4,
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Fechar aviso"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffb4b4',
          cursor: 'pointer',
          fontWeight: 900,
          fontSize: '0.9rem',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
