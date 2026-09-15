import type { BlendModeOption, DesignTransform, GarmentConfig, ViewSide } from '@/types/mockup'

// Peça padrão do editor (inline para MVP — sem seletor de peça na UI ainda;
// ver types/mockup.ts `GarmentDatabase` se isso virar catálogo de verdade).
export const GARMENT: GarmentConfig = {
  name: 'Oversized Tee',
  front: {
    // Logo pequeno no peito esquerdo de quem usa (lado direito da imagem,
    // já que a foto é "de frente" pra quem olha) — não é mais o print
    // grande centralizado, isso ficou só pro verso.
    image: '/garments/tshirt-front.jpg',
    imageWidth: 720,
    imageHeight: 1280,
    printArea: { x: 411, y: 399, width: 119, height: 123 },
  },
  back: {
    // Foto original vinha "menor" no frame que a da frente (mesma peça, mais
    // afastada da câmera) — reenquadrada (upscale + crop central 124%) pra
    // bater na mesma escala/posição da frente. printArea maior/mais
    // centralizada que a da frente por ajuste manual no editor.
    image: '/garments/tshirt-back.jpg',
    imageWidth: 720,
    imageHeight: 1280,
    printArea: { x: 164, y: 396, width: 376, height: 640 },
  },
}

export const BLEND_MODES: { label: string; value: BlendModeOption }[] = [
  { label: 'Normal', value: 'source-over' },
  { label: 'Screen', value: 'screen' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Multiply', value: 'multiply' },
]

// Transform default de uma estampa recém-carregada: preenche a área de
// impressão da peça, sem rotação/blend, em coordenadas de display (a área de
// impressão é definida em px da imagem original 720×1280 — `scale` converte
// pro tamanho que o container está sendo exibido na tela).
export function defaultTransformFor(garment: GarmentConfig, view: ViewSide, scale: number): DesignTransform {
  const pa = garment[view].printArea
  return {
    x: pa.x * scale,
    y: pa.y * scale,
    width: pa.width * scale,
    height: pa.height * scale,
    rotation: 0,
    opacity: 1,
    blendMode: 'source-over',
  }
}
