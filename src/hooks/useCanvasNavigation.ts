import { useState, useCallback, type RefObject } from 'react'
import type Konva from 'konva'

export interface CanvasNavigationState {
    scale: number
    position: { x: number; y: number }
}

export interface CanvasNavigationActions {
    zoomIn: () => void
    zoomOut: () => void
    resetView: () => void
    fitToScreen: () => void
    handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void
    setPosition: (pos: { x: number; y: number }) => void
}

export interface CanvasNavigationOptions {
    minScale?: number
    maxScale?: number
    scaleStep?: number
    initialScale?: number
    canvasWidth: number
    canvasHeight: number
    containerWidth: number
    containerHeight: number
}

const DEFAULT_OPTIONS = {
    minScale: 0.1,
    maxScale: 5,
    scaleStep: 0.15,
    initialScale: 1,
}

export function useCanvasNavigation(
    stageRef: RefObject<Konva.Stage | null>,
    options: CanvasNavigationOptions
): [CanvasNavigationState, CanvasNavigationActions] {
    const {
        minScale = DEFAULT_OPTIONS.minScale,
        maxScale = DEFAULT_OPTIONS.maxScale,
        scaleStep = DEFAULT_OPTIONS.scaleStep,
        canvasWidth,
        canvasHeight,
        containerWidth,
        containerHeight,
    } = options

    // Calculate initial scale to fit canvas in container
    const calculateFitScale = useCallback(() => {
        if (!containerWidth || !containerHeight || !canvasWidth || !canvasHeight) return 1
        const scaleX = containerWidth / canvasWidth
        const scaleY = containerHeight / canvasHeight
        return Math.min(scaleX, scaleY, 1) // Don't scale up, only down
    }, [containerWidth, containerHeight, canvasWidth, canvasHeight])

    const initialScale = calculateFitScale()

    const [scale, setScale] = useState(initialScale)
    const [position, setPosition] = useState({ x: 0, y: 0 })

    const clampScale = useCallback((newScale: number) => {
        return Math.max(minScale, Math.min(maxScale, newScale))
    }, [minScale, maxScale])

    const zoomIn = useCallback(() => {
        setScale(prev => clampScale(prev * (1 + scaleStep)))
    }, [clampScale, scaleStep])

    const zoomOut = useCallback(() => {
        setScale(prev => clampScale(prev * (1 - scaleStep)))
    }, [clampScale, scaleStep])

    const resetView = useCallback(() => {
        setScale(1)
        setPosition({ x: 0, y: 0 })
    }, [])

    const fitToScreen = useCallback(() => {
        const fitScale = calculateFitScale()
        setScale(fitScale)
        // Center the canvas
        const centeredX = (containerWidth - canvasWidth * fitScale) / 2
        const centeredY = (containerHeight - canvasHeight * fitScale) / 2
        setPosition({ x: Math.max(0, centeredX), y: Math.max(0, centeredY) })
    }, [calculateFitScale, containerWidth, containerHeight, canvasWidth, canvasHeight])

    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault()

        const stage = stageRef.current
        if (!stage) return

        const oldScale = scale
        const pointer = stage.getPointerPosition()
        if (!pointer) return

        const mousePointTo = {
            x: (pointer.x - position.x) / oldScale,
            y: (pointer.y - position.y) / oldScale,
        }

        // Zoom direction
        const direction = e.evt.deltaY > 0 ? -1 : 1
        const newScale = clampScale(oldScale * (1 + direction * scaleStep))

        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        }

        setScale(newScale)
        setPosition(newPos)
    }, [stageRef, scale, position, clampScale, scaleStep])

    return [
        { scale, position },
        { zoomIn, zoomOut, resetView, fitToScreen, handleWheel, setPosition }
    ]
}



