import { useState, useRef } from 'react'
import { useStandStore } from '../store/standStore'

type ToolbarMode = 'stands' | 'zones'

const STAND_TOOLS = [
  { id: 'stand-rect', label: 'Rectángulo', desc: 'Dibuja stands rectangulares' },
  { id: 'stand-polygon', label: 'Polígono', desc: 'Crea formas de múltiples lados' },
  { id: 'stand-free', label: 'Trazo libre', desc: 'Dibuja a mano alzada' },
] as const

const ZONE_TOOLS = [
  { id: 'zone-rect', label: 'Zona rectangular', desc: 'Área rectangular grande' },
  { id: 'zone-polygon', label: 'Zona polígono', desc: 'Área con múltiples lados' },
  { id: 'zone-free', label: 'Zona libre', desc: 'Área a mano alzada' },
  { id: 'zone-paint', label: 'Pintar zona', desc: 'Cambia el color de zonas' },
] as const

const Toolbar = () => {
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('stands')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const undoLast = useStandStore((state) => state.undoLast)
  const presets = useStandStore((state) => state.presets)
  const rectPresetId = useStandStore((state) => state.rectPresetId)
  const setRectPreset = useStandStore((state) => state.setRectPreset)
  const color = useStandStore((state) => state.color)
  const setColor = useStandStore((state) => state.setColor)
  const backgroundUrl = useStandStore((state) => state.backgroundUrl)
  const setBackgroundUrl = useStandStore((state) => state.setBackgroundUrl)
  const setBackgroundFile = useStandStore((state) => state.setBackgroundFile)
  const planoId = useStandStore((state) => state.planoId)
  const planoName = useStandStore((state) => state.planoName)

  const hasShapes = stands.length + zones.length > 0
  const currentTools = toolbarMode === 'stands' ? STAND_TOOLS : ZONE_TOOLS
  const isEditingArea = planoId || planoName

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBackgroundFile(file)
      const url = URL.createObjectURL(file)
      setBackgroundUrl(url)
    }
  }

  // Switch to select mode when changing toolbar mode
  const handleModeSwitch = (newMode: ToolbarMode) => {
    setToolbarMode(newMode)
    setMode('select')
  }

  return (
    <div className="toolbar-panel">
      {/* Mode Tabs */}
      <div className="toolbar-tabs">
        <button
          className={`toolbar-tab ${toolbarMode === 'stands' ? 'toolbar-tab--active' : ''}`}
          onClick={() => handleModeSwitch('stands')}
        >
          <span className="toolbar-tab__count">{stands.length}</span>
          Stands
        </button>
        <button
          className={`toolbar-tab ${toolbarMode === 'zones' ? 'toolbar-tab--active' : ''}`}
          onClick={() => handleModeSwitch('zones')}
        >
          <span className="toolbar-tab__count">{zones.length}</span>
          Zonas
        </button>
      </div>

      {/* Tools Section */}
      <div className="toolbar-section">
        <h4 className="toolbar-section__title">Herramientas</h4>

        <div className="toolbar-tools">
          <button
            className={`toolbar-tool ${mode === 'select' ? 'toolbar-tool--active' : ''}`}
            onClick={() => setMode('select')}
          >
            <div className="toolbar-tool__icon">↖</div>
            <div className="toolbar-tool__info">
              <span className="toolbar-tool__name">Seleccionar</span>
              <span className="toolbar-tool__desc">Mover y editar elementos</span>
            </div>
          </button>

          {currentTools.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar-tool ${mode === tool.id ? 'toolbar-tool--active' : ''}`}
              onClick={() => setMode(tool.id)}
            >
              <div className="toolbar-tool__icon">
                {tool.id.includes('rect') ? '▬' :
                  tool.id.includes('polygon') ? '⬡' :
                    tool.id.includes('paint') ? '◉' : '〰'}
              </div>
              <div className="toolbar-tool__info">
                <span className="toolbar-tool__name">{tool.label}</span>
                <span className="toolbar-tool__desc">{tool.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Presets - only for stands */}
      {toolbarMode === 'stands' && (
        <div className="toolbar-section">
          <h4 className="toolbar-section__title">Tamaños predefinidos</h4>
          <div className="toolbar-presets">
            <button
              className={`toolbar-preset ${rectPresetId === null ? 'toolbar-preset--active' : ''}`}
              onClick={() => setRectPreset(null)}
            >
              Libre
            </button>
            {presets.map((preset) => (
              <button
                key={preset.id}
                className={`toolbar-preset ${rectPresetId === preset.id ? 'toolbar-preset--active' : ''}`}
                onClick={() => setRectPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color picker for zones */}
      {toolbarMode === 'zones' && (
        <div className="toolbar-section">
          <h4 className="toolbar-section__title">Color de zona</h4>
          <div className="toolbar-color">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="toolbar-color__picker"
            />
            <span className="toolbar-color__label">{color}</span>
          </div>
        </div>
      )}

      {/* Background Image Section */}
      {isEditingArea && (
        <div className="toolbar-section">
          <h4 className="toolbar-section__title">Imagen de fondo</h4>
          <div className="toolbar-background">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            {backgroundUrl ? (
              <div className="toolbar-background__preview">
                <img src={backgroundUrl} alt="Fondo" />
                <button
                  className="toolbar-background__change"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                className="toolbar-background__add"
                onClick={() => fileInputRef.current?.click()}
              >
                + Seleccionar imagen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Undo button - pequeño y discreto */}
      {hasShapes && (
        <div className="toolbar-section toolbar-section--actions">
          <button
            onClick={undoLast}
            className="toolbar-undo-btn"
            title="Deshacer último elemento"
          >
            ↩ Deshacer
          </button>
        </div>
      )}
    </div>
  )
}

export default Toolbar
