// Logo da marca: "SixOneSix" em letras góticas (blackletter) com sangue
// escorrendo por baixo das letras, e "MAFIA · MOCKUP MAKER EXPRESS" como
// subtítulo simples abaixo. É um SVG com texto de largura forçada
// (`textLength`) pra que os pingos de sangue, com posições fixas em x,
// sempre caiam por baixo da palavra mesmo que a fonte gótica não carregue
// (cai pro fallback serif, mas a largura do texto continua a mesma).
const DRIPS = [
  { x: 34, len: 24, w: 5 },
  { x: 78, len: 12, w: 3.5 },
  { x: 122, len: 36, w: 6 },
  { x: 168, len: 8, w: 3 },
  { x: 210, len: 20, w: 4.5 },
  { x: 252, len: 44, w: 7 },
  { x: 296, len: 16, w: 4 },
  { x: 338, len: 28, w: 5.5 },
  { x: 380, len: 10, w: 3 },
]

// Formato de pingo: um "talo" reto que afina e termina numa gota
// arredondada — como sangue grosso escorrendo e formando uma bolha na ponta.
function dripPath(x: number, topY: number, len: number, w: number) {
  const bulbY = topY + len * 0.7
  const tipY = topY + len
  const bw = w * 1.7
  return `M ${x - w / 2} ${topY}
    L ${x - w / 2} ${bulbY - bw / 2}
    Q ${x - bw / 2} ${bulbY} ${x} ${tipY}
    Q ${x + bw / 2} ${bulbY} ${x + w / 2} ${bulbY - bw / 2}
    L ${x + w / 2} ${topY}
    Z`
}

export default function BloodLogo({
  size = 'md',
  tagline = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  tagline?: boolean
  className?: string
}) {
  const width = size === 'sm' ? 190 : size === 'lg' ? 460 : 300
  const viewH = tagline ? 145 : 112
  return (
    <svg
      viewBox={`0 0 420 ${viewH}`}
      width={width}
      height={(width / 420) * viewH}
      className={className}
      role="img"
      aria-label="SixOneSix Mafia — Mockup Maker Express"
      style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.65))' }}
    >
      <defs>
        <linearGradient id="bloodFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff2d3d" />
          <stop offset="55%" stopColor="#c40011" />
          <stop offset="100%" stopColor="#5c0009" />
        </linearGradient>
        <linearGradient id="bloodDrip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c40011" />
          <stop offset="100%" stopColor="#7a0008" />
        </linearGradient>
      </defs>

      <text
        x="10"
        y="66"
        fontFamily="'UnifrakturCook', 'UnifrakturMaguntia', serif"
        fontWeight={700}
        fontSize="66"
        textLength="400"
        lengthAdjust="spacingAndGlyphs"
        fill="url(#bloodFill)"
        stroke="#2b0000"
        strokeWidth="1"
      >
        SixOneSix
      </text>

      {DRIPS.map((d, i) => (
        <path key={i} d={dripPath(d.x, 62, d.len, d.w)} fill="url(#bloodDrip)" />
      ))}

      {tagline && (
        <text
          x="10"
          y="128"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight={800}
          fontSize="15"
          letterSpacing="0.28em"
          fill="#e8b9b9"
        >
          MAFIA · MOCKUP MAKER EXPRESS
        </text>
      )}
    </svg>
  )
}
