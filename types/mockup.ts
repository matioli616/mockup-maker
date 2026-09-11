export type ViewSide = 'front' | 'back'

export type BlendModeOption = 'source-over' | 'screen' | 'overlay' | 'multiply'

export interface PrintArea {
  x: number
  y: number
  width: number
  height: number
}

export interface GarmentView {
  image: string
  imageWidth: number
  imageHeight: number
  printArea: PrintArea
}

export interface GarmentConfig {
  name: string
  front: GarmentView
  back: GarmentView
}

export interface GarmentDatabase {
  [key: string]: GarmentConfig
}

export interface DesignTransform {
  x: number        // display px
  y: number        // display px
  width: number    // display px
  height: number   // display px
  rotation: number // degrees
  opacity: number  // 0-1
  blendMode: BlendModeOption
}
