import type { BlendModeOption, GarmentView } from '@/types/mockup'

interface ExportOptions {
  garmentView: GarmentView
  designSrc: string
  // Design position/size in display coordinates
  displayX: number
  displayY: number
  displayW: number
  displayH: number
  displayContainerW: number
  displayContainerH: number
  rotation: number
  opacity: number
  blendMode: BlendModeOption
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function exportMockup(opts: ExportOptions): Promise<void> {
  const {
    garmentView,
    designSrc,
    displayX, displayY, displayW, displayH,
    displayContainerW, displayContainerH,
    rotation, opacity, blendMode,
  } = opts

  const { imageWidth, imageHeight } = garmentView

  // Scale factors: display → original image coordinates
  const scaleX = imageWidth / displayContainerW
  const scaleY = imageHeight / displayContainerH

  const canvas = document.createElement('canvas')
  canvas.width = imageWidth
  canvas.height = imageHeight
  const ctx = canvas.getContext('2d')!

  // 1. Draw shirt background
  const shirtImg = await loadImg(garmentView.image)
  ctx.drawImage(shirtImg, 0, 0, imageWidth, imageHeight)

  // 2. Draw design with transform
  const designImg = await loadImg(designSrc)

  // Convert display coords to image coords
  const imgX = displayX * scaleX
  const imgY = displayY * scaleY
  const imgW = displayW * scaleX
  const imgH = displayH * scaleY
  const cx = imgX + imgW / 2
  const cy = imgY + imgH / 2

  ctx.save()
  ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation
  ctx.globalAlpha = opacity
  ctx.translate(cx, cy)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(designImg, -imgW / 2, -imgH / 2, imgW, imgH)
  ctx.restore()

  // 3. Download
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mockup-${Date.now()}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
