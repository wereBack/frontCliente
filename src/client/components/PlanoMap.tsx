import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Rect, Stage, Text, Image as KonvaImage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { PlanoData, SpaceData, ZoneData } from '../services/api'
import { useElementSize } from '../../hooks/useElementSize'

type PlanoMapProps = {
    plano: PlanoData
    selectedSpaceId: string | null
    onSelectSpace: (spaceId: string) => void
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    disponible: { bg: '#dcfce7', color: '#16a34a' },
    reservado: { bg: '#fef3c7', color: '#d97706' },
    bloqueado: { bg: '#fee2e2', color: '#dc2626' },
}

const PlanoMap = ({ plano, selectedSpaceId, onSelectSpace }: PlanoMapProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const size = useElementSize(containerRef)
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

    const aspectRatio = plano.width / plano.height
    const stageDimensions = useMemo(() => {
        const availableWidth = size.width || 800
        const idealHeight = availableWidth / aspectRatio
        const viewportLimit =
            typeof window !== 'undefined' ? Math.max(320, window.innerHeight * 0.7) : Number.POSITIVE_INFINITY
        const height = Math.min(idealHeight, viewportLimit)
        const scale = height / plano.height
        const width = plano.width * scale
        return { width, height, scale }
    }, [size.width, aspectRatio, plano.height, plano.width])

    useEffect(() => {
        if (!plano.url) {
            setBackgroundImage(null)
            return
        }
        const img = new window.Image()
        img.src = plano.url
        img.onload = () => setBackgroundImage(img)
        img.onerror = () => setBackgroundImage(null)
        return () => {
            setBackgroundImage(null)
        }
    }, [plano.url])

    const handleSelect = (event: KonvaEventObject<MouseEvent | TouchEvent>, space: SpaceData) => {
        event.cancelBubble = true
        onSelectSpace(space.id)
    }

    const getSpaceStatus = (space: SpaceData): string => {
        if (!space.active) return 'bloqueado'
        if (space.reservations && space.reservations.length > 0) {
            return space.reservations[0].estado === 'confirmada' ? 'reservado' : 'disponible'
        }
        return 'disponible'
    }

    return (
        <div ref={containerRef} className="stand-map__shell">
            <div
                className="stand-map__stage-wrapper"
                style={{ width: '100%', height: stageDimensions.height }}
            >
                <Stage width={stageDimensions.width} height={stageDimensions.height}>
                    {/* Background layer */}
                    <Layer listening={false}>
                        {backgroundImage ? (
                            <KonvaImage
                                image={backgroundImage}
                                width={plano.width * stageDimensions.scale}
                                height={plano.height * stageDimensions.scale}
                                listening={false}
                            />
                        ) : (
                            <Rect
                                x={0}
                                y={0}
                                width={plano.width * stageDimensions.scale}
                                height={plano.height * stageDimensions.scale}
                                fill="#f4f5f7"
                                listening={false}
                            />
                        )}
                    </Layer>

                    {/* Zones layer */}
                    <Layer listening={false}>
                        {plano.zones.map((zone: ZoneData) => (
                            <Rect
                                key={zone.id}
                                x={zone.x * stageDimensions.scale}
                                y={zone.y * stageDimensions.scale}
                                width={zone.width * stageDimensions.scale}
                                height={zone.height * stageDimensions.scale}
                                fill={zone.color}
                                opacity={0.3}
                                stroke={zone.color}
                                strokeWidth={2}
                                listening={false}
                            />
                        ))}
                    </Layer>

                    {/* Spaces (stands) layer */}
                    <Layer>
                        {plano.spaces.map((space: SpaceData) => {
                            const status = getSpaceStatus(space)
                            const meta = STATUS_COLORS[status] || STATUS_COLORS.disponible
                            const isSelected = selectedSpaceId === space.id

                            return (
                                <Group
                                    key={space.id}
                                    onClick={(event) => handleSelect(event, space)}
                                    onTap={(event) => handleSelect(event, space)}
                                >
                                    <Rect
                                        x={space.x * stageDimensions.scale}
                                        y={space.y * stageDimensions.scale}
                                        width={space.width * stageDimensions.scale}
                                        height={space.height * stageDimensions.scale}
                                        cornerRadius={6}
                                        fill={meta.bg}
                                        stroke={isSelected ? '#0f172a' : meta.color}
                                        strokeWidth={isSelected ? 3 : 2}
                                    />
                                    <Text
                                        x={space.x * stageDimensions.scale}
                                        y={
                                            space.y * stageDimensions.scale +
                                            (space.height * stageDimensions.scale) / 2 -
                                            9
                                        }
                                        width={space.width * stageDimensions.scale}
                                        text={space.name}
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

export default PlanoMap
