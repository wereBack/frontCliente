import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Rect, Stage, Text, Image as KonvaImage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { FloorMeta, FloorStand } from '../../types/stands'
import type { StandStatus } from '../../types/stands'
import { STATUS_META } from '../constants'
import { useElementSize } from '../../hooks/useElementSize'
import { toProxyUrl } from '../../utils/imageProxy'

type StandMapProps = {
  floor: FloorMeta
  statuses: Record<string, StandStatus>
  selectedStandId: string | null
  onSelect: (standId: string) => void
}

const StandMap = ({ floor, statuses, selectedStandId, onSelect }: StandMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const size = useElementSize(containerRef)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

  const aspectRatio = floor.dimensions.width / floor.dimensions.height
  const stageDimensions = useMemo(() => {
    const availableWidth = size.width
    const idealHeight = availableWidth / aspectRatio
    const viewportLimit =
      typeof window !== 'undefined' ? Math.max(320, window.innerHeight * 0.7) : Number.POSITIVE_INFINITY
    const height = Math.min(idealHeight, viewportLimit)
    const scale = height / floor.dimensions.height
    const width = floor.dimensions.width * scale
    return { width, height, scale }
  }, [size.width, aspectRatio, floor.dimensions.height, floor.dimensions.width])

  useEffect(() => {
    // Convertir URL de S3 a URL del proxy para evitar CORS
    const imageUrl = toProxyUrl(floor.image)
    
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => setBackgroundImage(img)
    img.onerror = () => setBackgroundImage(null)
    return () => {
      setBackgroundImage(null)
    }
  }, [floor.image])

  const handleMouseSelect = (event: KonvaEventObject<MouseEvent>, stand: FloorStand) => {
    event.cancelBubble = true
    onSelect(stand.id)
  }

  const handleTouchSelect = (event: KonvaEventObject<TouchEvent>, stand: FloorStand) => {
    event.cancelBubble = true
    onSelect(stand.id)
  }

  return (
    <div ref={containerRef} className="stand-map__shell">
      <div
        className="stand-map__stage-wrapper"
        style={{ width: '100%', height: stageDimensions.height }}
      >
        <Stage width={stageDimensions.width} height={stageDimensions.height}>
          <Layer listening={false}>
            {backgroundImage ? (
              <KonvaImage
                image={backgroundImage}
                width={floor.dimensions.width * stageDimensions.scale}
                height={floor.dimensions.height * stageDimensions.scale}
                listening={false}
              />
            ) : (
              <Rect
                x={0}
                y={0}
                width={floor.dimensions.width * stageDimensions.scale}
                height={floor.dimensions.height * stageDimensions.scale}
                fill="#f4f5f7"
                listening={false}
              />
            )}
          </Layer>

          <Layer>
            {floor.stands.map((stand) => {
              const status = statuses[stand.id] ?? stand.status
              const meta = STATUS_META[status]
              const isSelected = selectedStandId === stand.id
              return (
                <Group
                  key={stand.id}
                  onClick={(event) => handleMouseSelect(event, stand)}
                  onTap={(event) => handleTouchSelect(event, stand)}
                >
                  <Rect
                    x={stand.shape.x * stageDimensions.scale}
                    y={stand.shape.y * stageDimensions.scale}
                    width={stand.shape.width * stageDimensions.scale}
                    height={stand.shape.height * stageDimensions.scale}
                    cornerRadius={6}
                    fill={meta.bg}
                    stroke={isSelected ? '#0f172a' : meta.color}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <Text
                    x={stand.shape.x * stageDimensions.scale}
                    y={
                      stand.shape.y * stageDimensions.scale +
                      (stand.shape.height * stageDimensions.scale) / 2 -
                      9
                    }
                    width={stand.shape.width * stageDimensions.scale}
                    text={stand.label}
                    fontSize={14}
                    fontStyle="600"
                    fill="#0f172a"
                    align="center"
                  />
                </Group>
              )
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

export default StandMap


