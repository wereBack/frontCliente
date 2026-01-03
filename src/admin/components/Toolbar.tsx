import type { ChangeEvent } from 'react'
import { useStandStore } from '../store/standStore'

const STAND_TOOLS = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'stand-rect', label: 'Rectángulo' },
  { id: 'stand-polygon', label: 'Polígono' },
  { id: 'stand-free', label: 'Trazo libre' },
  { id: 'stand-paint', label: 'Pintar stand' },
] as const

const ZONE_TOOLS = [
  { id: 'zone-rect', label: 'Zona rectángulo' },
  { id: 'zone-polygon', label: 'Zona polígono' },
  { id: 'zone-free', label: 'Zona libre' },
  { id: 'zone-paint', label: 'Pintar zona' },
] as const

const COLOR_PRESETS = ['#ffb703', '#fb8500', '#8ecae6', '#219ebc', '#9b5de5']

type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const color = useStandStore((state) => state.color)
  const setColor = useStandStore((state) => state.setColor)
  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const undoLast = useStandStore((state) => state.undoLast)
  const clearAll = useStandStore((state) => state.clearAll)
  const presets = useStandStore((state) => state.presets)
  const rectPresetId = useStandStore((state) => state.rectPresetId)
  const setRectPreset = useStandStore((state) => state.setRectPreset)
  const savePlano = useStandStore((state) => state.savePlano)
  const isSaving = useStandStore((state) => state.isSaving)

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      return
    }
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

  const hasShapes = stands.length + zones.length > 0

  return (
    <aside className="toolbar">
      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas de stands</p>
        <div className="toolbar__grid">
          {STAND_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${mode === tool.id ? 'toolbar__button--active' : ''
                }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Herramientas de zonas</p>
        <div className="toolbar__grid">
          {ZONE_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar__button ${mode === tool.id ? 'toolbar__button--active' : ''
                }`}
              onClick={() => setMode(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Tamaños de stand</p>
        <div className="toolbar__chips">
          <button
            className={`toolbar__chip ${rectPresetId === null ? 'toolbar__chip--active' : ''
              }`}
            onClick={() => setRectPreset(null)}
          >
            Libre
          </button>
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`toolbar__chip ${rectPresetId === preset.id ? 'toolbar__chip--active' : ''
                }`}
              onClick={() => setRectPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <small className="toolbar__hint">
          Con un preset activo, sólo elegís la orientación del stand al arrastrar.
        </small>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Color activo</p>
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="toolbar__color-picker"
        />
        <div className="toolbar__swatches">
          {COLOR_PRESETS.map((presetColor) => (
            <button
              key={presetColor}
              className="toolbar__swatch"
              style={{ backgroundColor: presetColor }}
              onClick={() => setColor(presetColor)}
              aria-label={`Usar color ${presetColor}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Plano base</p>
        <label className="toolbar__upload">
          <span>Subir imagen</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
        </label>
        <button
          className="toolbar__button toolbar__button--ghost"
          onClick={() => onBackgroundChange(undefined)}
        >
          Quitar imagen
        </button>
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Acciones</p>
        <div className="toolbar__stack">
          <button
            onClick={savePlano}
            disabled={isSaving}
            className="toolbar__button toolbar__button--active"
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Mapa'}
          </button>
          <button
            onClick={undoLast}
            disabled={!hasShapes}
            className="toolbar__button toolbar__button--ghost"
          >
            Deshacer último
          </button>
          <button
            onClick={clearAll}
            disabled={!hasShapes}
            className="toolbar__button toolbar__button--danger"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Toolbar

