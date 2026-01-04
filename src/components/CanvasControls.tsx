import './CanvasControls.css'

interface CanvasControlsProps {
    scale: number
    onZoomIn: () => void
    onZoomOut: () => void
    onReset: () => void
    onFitToScreen: () => void
    minScale?: number
    maxScale?: number
    showPanHint?: boolean  // Show space-to-pan hint (for admin)
}

const CanvasControls = ({
    scale,
    onZoomIn,
    onZoomOut,
    onReset,
    onFitToScreen,
    minScale = 0.1,
    maxScale = 5,
    showPanHint = false,
}: CanvasControlsProps) => {
    const zoomPercentage = Math.round(scale * 100)

    return (
        <div className="canvas-controls">
            <div className="canvas-controls__group">
                <button
                    className="canvas-controls__btn"
                    onClick={onZoomOut}
                    disabled={scale <= minScale}
                    title="Alejar (scroll hacia abajo)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </button>
                
                <span className="canvas-controls__zoom-level">{zoomPercentage}%</span>
                
                <button
                    className="canvas-controls__btn"
                    onClick={onZoomIn}
                    disabled={scale >= maxScale}
                    title="Acercar (scroll hacia arriba)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                </button>
            </div>

            <div className="canvas-controls__divider" />

            <button
                className="canvas-controls__btn"
                onClick={onFitToScreen}
                title="Ajustar a pantalla"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
            </button>

            <button
                className="canvas-controls__btn"
                onClick={onReset}
                title="Restablecer vista (100%)"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                </svg>
            </button>

            <div className="canvas-controls__hint">
                <span>🖱️ Scroll: zoom</span>
                {showPanHint ? (
                    <span>⎵ Space + arrastrar: mover</span>
                ) : (
                    <span>✋ Arrastrar: mover</span>
                )}
            </div>
        </div>
    )
}

export default CanvasControls

