export type StandStatus = 'disponible' | 'pendiente' | 'reservado' | 'bloqueado'

export type StandAmenity =
  | 'electricidad'
  | 'internet'
  | 'agua'
  | 'bodega'
  | 'pantalla'
  | 'showroom'
  | 'montaje'

export type RectShape = {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type StandShape = RectShape

export type FloorStand = {
  id: string
  label: string
  status: StandStatus
  company?: string
  price: number
  size: string
  category: 'premium' | 'standard' | 'startup'
  amenities?: StandAmenity[]
  highlight?: string
  description?: string
  shape: StandShape
}

export type FloorMeta = {
  id: string
  name: string
  description: string
  image: string
  dimensions: {
    width: number
    height: number
  }
  stands: FloorStand[]
}

