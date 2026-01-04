import { useState, type ChangeEvent } from 'react'
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

type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('stands')

  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const undoLast = useStandStore((state) => state.undoLast)
  const clearAll = useStandStore((state) => state.clearAll)
  const presets = useStandStore((state) => state.presets)
  const rectPresetId = useStandStore((state) => state.rectPresetId)
  const setRectPreset = useStandStore((state) => state.setRectPreset)
  const savePlano = useStandStore((state) => state.savePlano)
  const isSaving = useStandStore((state) => state.isSaving)
  const planoName = useStandStore((state) => state.planoName)
  const setPlanoName = useStandStore((state) => state.setPlanoName)
  const setBackgroundFile = useStandStore((state) => state.setBackgroundFile)
  const backgroundUrl = useStandStore((state) => state.backgroundUrl)
  const color = useStandStore((state) => state.color)
  const setColor = useStandStore((state) => state.setColor)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      setBackgroundFile(null)
      return
    }
    setBackgroundFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        onBackgroundChange(result)
      }
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveBackground = () => {
    onBackgroundChange(undefined)
    setBackgroundFile(null)
  }

  const hasShapes = stands.length + zones.length > 0
  const currentTools = toolbarMode === 'stands' ? STAND_TOOLS : ZONE_TOOLS

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

      {/* Plano Name */}
      <div className="toolbar-section">
        <h4 className="toolbar-section__title">Nombre del plano</h4>
        <input
          type="text"
          className="toolbar-input"
          value={planoName}
          onChange={(e) => setPlanoName(e.target.value)}
          placeholder="Ej: Sector A - Piso 1"
        />
      </div>

      {/* Background Image */}
      <div className="toolbar-section">
        <h4 className="toolbar-section__title">Imagen de fondo</h4>
        {backgroundUrl ? (
          <div className="toolbar-image-preview">
            <img src={backgroundUrl} alt="Fondo" className="toolbar-image-preview__img" />
            <div className="toolbar-image-preview__actions">
              <label className="toolbar-image-preview__change">
                Cambiar
                <input
                  type="file"
                  accept="image/*,.svg"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                className="toolbar-image-preview__remove"
                onClick={handleRemoveBackground}
              >
                Quitar
              </button>
            </div>
          </div>
        ) : (
          <label className="toolbar-upload">
            <input
              type="file"
              accept="image/*,.svg"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <div className="toolbar-upload__icon">+</div>
            <span>Cargar imagen del plano</span>
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="toolbar-actions">
        <button
          onClick={savePlano}
          disabled={isSaving}
          className="toolbar-btn toolbar-btn--primary"
        >
          {isSaving ? 'Guardando...' : 'Guardar plano'}
        </button>
        <div className="toolbar-actions__row">
          <button
            onClick={undoLast}
            disabled={!hasShapes}
            className="toolbar-btn toolbar-btn--secondary"
          >
            Deshacer
          </button>
          <button
            onClick={clearAll}
            disabled={!hasShapes}
            className="toolbar-btn toolbar-btn--danger"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
