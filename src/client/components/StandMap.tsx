import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Rect, Stage, Text, Image as KonvaImage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { FloorMeta, FloorStand } from '../../types/stands'
import type { StandStatus } from '../../types/stands'
import { STATUS_META } from '../constants'
import { useElementSize } from '../../hooks/useElementSize'

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

  const scale = useMemo(() => {
    const widthRatio = size.width / floor.dimensions.width
    const heightRatio = size.height / floor.dimensions.height
    return Math.min(widthRatio, heightRatio)
  }, [size, floor.dimensions.height, floor.dimensions.width])

  const stageWidth = Math.min(size.width, floor.dimensions.width * scale)
  const stageHeight = Math.min(size.height, floor.dimensions.height * scale)

  useEffect(() => {
    const img = new window.Image()
    img.src = floor.image
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
        style={{ width: stageWidth, height: stageHeight }}
      >
        <Stage width={stageWidth} height={stageHeight}>
          <Layer listening={false}>
            {backgroundImage ? (
              <KonvaImage
                image={backgroundImage}
                width={floor.dimensions.width * scale}
                height={floor.dimensions.height * scale}
                listening={false}
              />
            ) : (
              <Rect
                x={0}
                y={0}
                width={floor.dimensions.width * scale}
                height={floor.dimensions.height * scale}
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
                    x={stand.shape.x * scale}
                    y={stand.shape.y * scale}
                    width={stand.shape.width * scale}
                    height={stand.shape.height * scale}
                    cornerRadius={6}
                    fill={meta.bg}
                    stroke={isSelected ? '#0f172a' : meta.color}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <Text
                    x={stand.shape.x * scale}
                    y={stand.shape.y * scale + stand.shape.height * scale / 2 - 9}
                    width={stand.shape.width * scale}
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


