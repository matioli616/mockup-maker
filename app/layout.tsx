import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SixOneSix Mockup Maker Express — SixOneSix Mafia',
  description: 'Cria mockups de camiseta streetwear em segundos. Upload da estampa, posiciona e exporta em alta resolução.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
