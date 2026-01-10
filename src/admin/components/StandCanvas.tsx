import { type ReactNode, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { toProxyUrl } from '../../utils/imageProxy'
import type { KonvaEventObject } from 'konva/lib/Node'
import type {
  DrawingMode,
  FreeShape,
  PolygonShape,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'
import CanvasControls from '../../components/CanvasControls'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'paint' | 'rect' | 'polygon' | 'free'
type DraftTool = Exclude<ToolAction, 'select' | 'paint'>
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const setCanvasSize = useStandStore((state) => state.setCanvasSize)
  const canvasWidth = useStandStore((state) => state.canvasWidth)
  const canvasHeight = useStandStore((state) => state.canvasHeight)
  const getNextStandNumber = useStandStore((state) => state.getNextStandNumber)
  const checkOverlap = useStandStore((state) => state.checkOverlap)
  const getNextZoneNumber = useStandStore((state) => state.getNextZoneNumber)
  const checkZoneOverlap = useStandStore((state) => state.checkZoneOverlap)
  const showGrid = useStandStore((state) => state.showGrid)
  const gridSize = useStandStore((state) => state.gridSize)
  const snapPosition = useStandStore((state) => state.snapPosition)
  const rectPreset = useStandStore((state) => {
    if (!state.rectPresetId) return null
    return state.presets.find((preset) => preset.id === state.rectPresetId) ?? null
  })

  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<number[]>([])
  const [freePoints, setFreePoints] = useState<number[]>([])
  const [isFreeDrawing, setIsFreeDrawing] = useState(false)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  // Container size tracking for auto-fit
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  // Zoom state
  const [scale, setScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  const MIN_SCALE = 0.1
  const MAX_SCALE = 5
  const SCALE_STEP = 0.15

  const modeMeta = useMemo(() => parseMode(mode), [mode])

  // Track container size
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    updateContainerSize()
    window.addEventListener('resize', updateContainerSize)

    // Also observe container itself
    const resizeObserver = new ResizeObserver(updateContainerSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateContainerSize)
      resizeObserver.disconnect()
    }
  }, [])

  // Calculate fit scale
  const fitScale = useMemo(() => {
    if (!canvasWidth || !canvasHeight) return 1
    const scaleX = containerSize.width / canvasWidth
    const scaleY = containerSize.height / canvasHeight
    return Math.min(scaleX, scaleY, 1)
  }, [containerSize.width, containerSize.height, canvasWidth, canvasHeight])

  // Auto-fit when canvas size changes
  useEffect(() => {
    if (canvasWidth && canvasHeight) {
      setScale(fitScale)
      // Center the canvas
      const centeredX = (containerSize.width - canvasWidth * fitScale) / 2
      const centeredY = (containerSize.height - canvasHeight * fitScale) / 2
      setStagePosition({ x: Math.max(0, centeredX), y: Math.max(0, centeredY) })
    }
  }, [canvasWidth, canvasHeight, fitScale, containerSize])

  // Zoom functions
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(MAX_SCALE, prev * (1 + SCALE_STEP)))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(MIN_SCALE, prev * (1 - SCALE_STEP)))
  }, [])

  const resetView = useCallback(() => {
    setScale(1)
    setStagePosition({ x: 0, y: 0 })
  }, [])

  const fitToScreen = useCallback(() => {
    setScale(fitScale)
    const centeredX = (containerSize.width - canvasWidth * fitScale) / 2
    const centeredY = (containerSize.height - canvasHeight * fitScale) / 2
    setStagePosition({ x: Math.max(0, centeredX), y: Math.max(0, centeredY) })
  }, [fitScale, containerSize, canvasWidth, canvasHeight])

  // Handle wheel zoom
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const oldScale = scale
    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * (1 + direction * SCALE_STEP)))

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }

    setScale(newScale)
    setStagePosition(newPos)
  }, [scale, stagePosition])

  // Space key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSpacePressed])

  // Display dimensions (scaled)
  const displayWidth = containerSize.width
  const displayHeight = containerSize.height

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    // Convertir URL de S3 a URL del proxy para evitar CORS
    const imageUrl = toProxyUrl(backgroundSrc)

    const loadImage = () => {
      const image = new window.Image()
      image.crossOrigin = 'anonymous'

      image.onload = () => {
        const imgWidth = image.naturalWidth || image.width
        const imgHeight = image.naturalHeight || image.height

        if (imgWidth > 0 && imgHeight > 0) {
          setCanvasSize(imgWidth, imgHeight)
        } else {
          console.warn('Imagen sin dimensiones validas')
        }
        setBackgroundImage(image)
      }

      image.onerror = () => {
        console.error('Error loading background image:', imageUrl)
        setBackgroundImage(null)
      }

      image.src = imageUrl
    }

    loadImage()
  }, [backgroundSrc, setCanvasSize])

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)
    setPolygonPoints([])
    setFreePoints([])
    setIsFreeDrawing(false)
    setDraftContext(null)
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) return null
    // Adjust for scale and position
    const rawPos = {
      x: (pointer.x - stagePosition.x) / scale,
      y: (pointer.y - stagePosition.y) / scale,
    }
    // Apply snap to grid if enabled
    return snapPosition(rawPos.x, rawPos.y)
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      const stand = shape as Stand

      // Check for overlap with existing stands (only for rect shapes)
      if (stand.kind === 'rect') {
        const overlappingStand = checkOverlap({ x: stand.x, y: stand.y, width: stand.width, height: stand.height })
        if (overlappingStand) {
          alert(`¡No se puede crear el stand! Se superpone con "${overlappingStand.label || 'otro stand'}"`)
          resetDrafts()
          return
        }
      }

      // Auto-assign label "Stand nuevo X"
      const nextNum = getNextStandNumber()
      let standWithLabel = { ...stand, label: `Stand nuevo ${nextNum}` }

      // Check if inside a zone to inherit price
      if (stand.kind === 'rect') {
        const standCenterX = stand.x + stand.width / 2
        const standCenterY = stand.y + stand.height / 2

        for (const zone of zones) {
          if (zone.kind === 'rect') {
            const isInside =
              standCenterX >= zone.x &&
              standCenterX <= zone.x + zone.width &&
              standCenterY >= zone.y &&
              standCenterY <= zone.y + zone.height

            if (isInside && zone.price != null) {
              standWithLabel = { ...standWithLabel, price: zone.price }
              break
            }
          }
        }
      }

      addStand(standWithLabel)
    } else {
      const zone = shape as Zone

      // Check for overlap with existing zones (only for rect shapes)
      if (zone.kind === 'rect') {
        const overlappingZone = checkZoneOverlap({ x: zone.x, y: zone.y, width: zone.width, height: zone.height })
        if (overlappingZone) {
          alert(`¡No se puede crear la zona! Se superpone con "${overlappingZone.label || 'otra zona'}"`)
          resetDrafts()
          return
        }
      }

      // Auto-assign label "Zona nueva X"
      const nextZoneNum = getNextZoneNumber()
      const zoneWithLabel = { ...zone, label: `Zona nueva ${nextZoneNum}` }

      addZone(zoneWithLabel)
    }
    resetDrafts()
  }

  const handleStageMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      return
    }

    if (modeMeta.tool === 'polygon') {
      if (event.evt.detail === 2) {
        const nextPoints = [...polygonPoints, pos.x, pos.y]
        if (nextPoints.length >= 6) {
          commitShape(
            {
              id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              kind: 'polygon',
              points: nextPoints,
              color,
            },
            draftContext?.subject ?? modeMeta.subject,
          )
        }
        return
      }

      if (!draftContext || draftContext.tool !== 'polygon') {
        setDraftContext({ subject: modeMeta.subject, tool: 'polygon' })
        setPolygonPoints([pos.x, pos.y])
      } else {
        setPolygonPoints((points) => [...points, pos.x, pos.y])
      }
      return
    }

    if (modeMeta.tool === 'free') {
      setDraftContext({ subject: modeMeta.subject, tool: 'free' })
      setIsFreeDrawing(true)
      setFreePoints([pos.x, pos.y])
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }

    if (isFreeDrawing && draftContext?.tool === 'free') {
      setFreePoints((points) => [...points, pos.x, pos.y])
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }

    if (draftContext?.tool === 'free' && isFreeDrawing) {
      setIsFreeDrawing(false)
      if (freePoints.length >= 6) {
        const freeShape: FreeShape = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          kind: 'free',
          points: freePoints,
          color,
        }
        commitShape(freeShape, draftContext.subject)
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    const deltaX = node.x()
    const deltaY = node.y()
    node.position({ x: 0, y: 0 })

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    if (shape.kind === 'rect') {
      updateStand(shape.id, { x: shape.x + deltaX, y: shape.y + deltaY })
      return
    }

    const nextPoints = translatePoints(shape.points, deltaX, deltaY)
    updateStand(shape.id, { points: nextPoints })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true

    if (modeMeta.tool === 'paint' && modeMeta.subject === subject) {
      if (subject === 'stand') {
        updateStand(shape.id, { color })
      } else {
        updateZone(shape.id, { color })
      }
      return
    }

    if (subject === 'stand') {
      selectStand(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'

  // Colores según estado de reserva
  const getStandFillColor = (stand: Stand): string => {
    switch (stand.reservationStatus) {
      case 'PENDING':
        return '#fbbf24' // Amarillo-naranja
      case 'RESERVED':
        return '#ef4444' // Rojo
      case 'BLOCKED':
        return '#9ca3af' // Gris
      case 'AVAILABLE':
      default:
        return '#22c55e' // Verde
    }
  }

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#64748b') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1
    const isStand = subject === 'stand'
    const fillColor = isStand ? getStandFillColor(shape as Stand) : shape.color

    const dragProps =
      isStand && canDragStand
        ? {
          draggable: true,
          onDragStart: () => selectStand(shape.id),
          onDragEnd: (event: KonvaEventObject<DragEvent>) =>
            handleStandDragEnd(event, shape as Stand),
        }
        : {}

    let shapeNode: ReactNode

    if (shape.kind === 'rect') {
      shapeNode = (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={fillColor}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening
        />
      )
    } else if (shape.kind === 'polygon') {
      shapeNode = (
        <Line
          points={shape.points}
          closed
          fill={fillColor}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening
        />
      )
    } else {
      shapeNode = (
        <Line
          points={shape.points}
          stroke={stroke}
          fill={fillColor}
          opacity={opacity}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
          listening
        />
      )
    }

    if (isStand) {
      return (
        <Group
          key={`stand-${shape.id}`}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        >
          {shapeNode}
          {shape.label ? renderStandLabel(shape as Stand) : null}
        </Group>
      )
    }

    return (
      <Group key={`zone-${shape.id}`} onClick={(event) => handleShapeClick(event, shape, subject)}>
        {shapeNode}
      </Group>
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'paint':
        return 'pointer'
      case 'rect':
      case 'polygon':
      case 'free':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div
      ref={containerRef}
      className="canvas-shell"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Stage
        ref={stageRef}
        width={displayWidth}
        height={displayHeight}
        scaleX={scale}
        scaleY={scale}
        x={stagePosition.x}
        y={stagePosition.y}
        className="canvas-stage"
        onWheel={handleWheel}
        onMouseDown={(e) => {
          if (isSpacePressed) {
            setIsPanning(true)
          } else {
            handleStageMouseDown(e)
          }
        }}
        onMouseMove={(e) => {
          if (isPanning) {
            const stage = stageRef.current
            if (stage) {
              const pos = stage.getPointerPosition()
              if (pos) {
                // Get movement delta
                const dx = e.evt.movementX
                const dy = e.evt.movementY
                setStagePosition(prev => ({
                  x: prev.x + dx,
                  y: prev.y + dy,
                }))
              }
            }
          } else {
            handleStageMouseMove()
          }
        }}
        onMouseUp={() => {
          if (isPanning) {
            setIsPanning(false)
          } else {
            handleStageMouseUp()
          }
        }}
        style={{ cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : stageCursor }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={canvasWidth}
              height={canvasHeight}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="#f1f3f5"
              listening={false}
            />
          )}

          {/* Grid Overlay */}
          {showGrid && (
            <>
              {/* Vertical lines */}
              {Array.from({ length: Math.ceil(canvasWidth / gridSize) + 1 }, (_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * gridSize, 0, i * gridSize, canvasHeight]}
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                  opacity={0.5}
                  listening={false}
                />
              ))}
              {/* Horizontal lines */}
              {Array.from({ length: Math.ceil(canvasHeight / gridSize) + 1 }, (_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * gridSize, canvasWidth, i * gridSize]}
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                  opacity={0.5}
                  listening={false}
                />
              ))}
            </>
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}
          {polygonPoints.length > 0 && (
            <Line
              points={polygonPoints}
              stroke={color}
              strokeWidth={2}
              dash={[6, 4]}
              closed={false}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {freePoints.length > 0 && (
            <Line
              points={freePoints}
              stroke={color}
              strokeWidth={3}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      <CanvasControls
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onFitToScreen={fitToScreen}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        showPanHint={true}
      />
    </div>
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

export default StandCanvas
const translatePoints = (points: number[], dx: number, dy: number) =>
  points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy))

const LABEL_FONT_SIZE = 13
const LABEL_MIN_WIDTH = 60

const getShapeBounds = (shape: RectShape | FreeShape | PolygonShape) => {
  if (shape.kind === 'rect') {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    }
  }

  if (shape.points.length < 2) {
    return { x: shape.points[0] ?? 0, y: shape.points[1] ?? 0, width: 0, height: 0 }
  }

  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < shape.points.length; i += 2) {
    xs.push(shape.points[i])
    ys.push(shape.points[i + 1] ?? shape.points[i])
  }
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

const renderStandLabel = (shape: Stand) => {
  if (!shape.label) {
    return null
  }
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2

  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      fontStyle="600"
      fill="#0f172a"
      align="center"
      listening={false}
      shadowColor="rgba(15, 23, 42, 0.3)"
      shadowBlur={4}
      shadowOffsetY={1}
      padding={2}
    />
  )
}
