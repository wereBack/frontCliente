import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Rect, Stage, Text, Image as KonvaImage } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { PlanoData, SpaceData, ZoneData } from '../services/api'
import { useElementSize } from '../../hooks/useElementSize'
import { useCanvasNavigation } from '../../hooks/useCanvasNavigation'
import CanvasControls from '../../components/CanvasControls'
import { toProxyUrl } from '../../utils/imageProxy'

type PlanoMapProps = {
    plano: PlanoData
    selectedSpaceId: string | null
    onSelectSpace: (spaceId: string) => void
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    disponible: { bg: '#dcfce7', color: '#16a34a' },
    pendiente: { bg: '#fef3c7', color: '#f59e0b' },
    reservado: { bg: '#fee2e2', color: '#dc2626' },
    bloqueado: { bg: '#e2e8f0', color: '#64748b' },
}

const PlanoMap = ({ plano, selectedSpaceId, onSelectSpace }: PlanoMapProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const stageRef = useRef<Konva.Stage | null>(null)
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

    // Canvas navigation (zoom/pan)
    const [navState, navActions] = useCanvasNavigation(stageRef, {
        canvasWidth: plano.width * stageDimensions.scale,
        canvasHeight: plano.height * stageDimensions.scale,
        containerWidth: stageDimensions.width,
        containerHeight: stageDimensions.height,
        minScale: 0.5,
        maxScale: 4,
    })

    useEffect(() => {
        if (!plano.url) {
            setBackgroundImage(null)
            return
        }

        // Convertir URL de S3 a URL del proxy para evitar CORS
        const imageUrl = toProxyUrl(plano.url)

        const img = new window.Image()
        img.crossOrigin = 'anonymous'

        img.src = imageUrl

        img.onload = () => {
            setBackgroundImage(img)
        }
        img.onerror = (err) => {
            console.error('Error loading background image:', err)
            setBackgroundImage(null)
        }

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
            const activeReservation = space.reservations.find(r => r.estado === 'RESERVED' || r.estado === 'PENDING')
            if (activeReservation?.estado === 'PENDING') return 'pendiente'
            if (activeReservation?.estado === 'RESERVED') return 'reservado'
        }
        return 'disponible'
    }

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
        navActions.setPosition({
            x: e.target.x(),
            y: e.target.y(),
        })
    }

    return (
        <div ref={containerRef} className="stand-map__shell">
            <div
                className="stand-map__stage-wrapper"
                style={{
                    width: '100%',
                    height: stageDimensions.height,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <Stage
                    ref={stageRef}
                    width={stageDimensions.width}
                    height={stageDimensions.height}
                    scaleX={navState.scale}
                    scaleY={navState.scale}
                    x={navState.position.x}
                    y={navState.position.y}
                    draggable
                    onWheel={navActions.handleWheel}
                    onDragEnd={handleDragEnd}
                >
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

                <CanvasControls
                    scale={navState.scale}
                    onZoomIn={navActions.zoomIn}
                    onZoomOut={navActions.zoomOut}
                    onReset={navActions.resetView}
                    onFitToScreen={navActions.fitToScreen}
                    minScale={0.5}
                    maxScale={4}
                />
            </div>
        </div>
    )
}

export default PlanoMap
