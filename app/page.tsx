import Link from 'next/link'

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 40px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontWeight: 900,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            color: 'var(--accent)',
          }}
        >
          MOCKUPDROP
        </span>
        <Link
          href="/editor"
          style={{
            background: 'var(--accent)',
            color: '#000',
            padding: '8px 20px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '0.85rem',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}
        >
          ABRIR EDITOR →
        </Link>
      </nav>

      {/* Hero */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 40px',
          textAlign: 'center',
          gap: '32px',
        }}
      >
        {/* Badge */}
        <span
          style={{
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            padding: '4px 14px',
            borderRadius: '100px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
        >
          STREETWEAR MOCKUP MAKER
        </span>

        <h1
          style={{
            fontSize: 'clamp(3rem, 8vw, 7rem)',
            fontWeight: 900,
            lineHeight: '0.95',
            letterSpacing: '-0.04em',
            maxWidth: '900px',
            margin: 0,
          }}
        >
          CRIA.{' '}
          <span style={{ color: 'var(--accent)' }}>POSICIONA.</span>
          <br />
          EXPORTA.
        </h1>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '1.1rem',
            maxWidth: '480px',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Upload da sua estampa, cola na camiseta frente ou verso,
          ajusta a posição e baixa o mockup em alta resolução.
          Zero Photoshop.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/editor"
            style={{
              background: 'var(--accent)',
              color: '#000',
              padding: '16px 36px',
              borderRadius: '8px',
              fontWeight: 900,
              fontSize: '1rem',
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            CRIAR MOCKUP GRÁTIS
          </Link>
          <a
            href="#features"
            style={{
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '16px 36px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            VER COMO FUNCIONA
          </a>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        style={{
          padding: '80px 40px',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {[
            {
              icon: '⬆️',
              title: 'Upload Direto',
              desc: 'PNG, SVG, JPG com ou sem fundo. Arrasta ou clica para enviar.',
            },
            {
              icon: '🎯',
              title: 'Frente & Verso',
              desc: 'Alterna entre frente e verso da camiseta em um clique.',
            },
            {
              icon: '🖼️',
              title: 'Export HD',
              desc: 'Baixa o mockup em resolução original 720×1280px pronto para usar.',
            },
            {
              icon: '⚡',
              title: 'Zero Photoshop',
              desc: 'Tudo no browser. Sem instalar nada, sem conta obrigatória.',
            },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '2rem' }}>{f.icon}</span>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>{f.title}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '24px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
        }}
      >
        <span style={{ fontWeight: 800, color: 'var(--accent)' }}>MOCKUPDROP</span>
        <span>Feito para marcas streetwear 🔥</span>
      </footer>
    </main>
  )
}
