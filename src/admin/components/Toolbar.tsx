import type { ChangeEvent } from 'react'
import { useStandStore } from '../store/standStore'

const STAND_TOOLS = [
  { id: 'select', label: 'Seleccionar' },
  { id: 'stand-rect', label: 'Rectángulo' },
  { id: 'stand-polygon', label: 'Polígono' },
  { id: 'stand-free', label: 'Trazo libre' },
] as const

const ZONE_TOOLS = [
  { id: 'zone-rect', label: 'Zona rectángulo' },
  { id: 'zone-polygon', label: 'Zona polígono' },
  { id: 'zone-free', label: 'Zona libre' },
  { id: 'zone-paint', label: 'Pintar zona' },
] as const


type ToolbarProps = {
  onBackgroundChange: (file?: string) => void
}

const Toolbar = ({ onBackgroundChange }: ToolbarProps) => {
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

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onBackgroundChange(undefined)
      setBackgroundFile(null)
      return
    }
    // Guardar el archivo original para subir a S3 al guardar
    setBackgroundFile(file)
    // Convertir a base64 para preview local
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
        <p className="toolbar__title">Nombre del plano</p>
        <input
          type="text"
          className="toolbar__input"
          value={planoName}
          onChange={(e) => setPlanoName(e.target.value)}
          placeholder="Nombre del plano"
        />
      </div>

      <div className="toolbar__section">
        <p className="toolbar__title">Plano base</p>
        <label className="toolbar__upload">
          <span>Subir imagen</span>
          <input 
            type="file" 
            accept="image/*,.svg,image/svg+xml" 
            onChange={handleFileUpload} 
          />
        </label>
        <button
          className="toolbar__button toolbar__button--ghost"
          onClick={handleRemoveBackground}
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
            {isSaving ? 'Guardando...' : 'Guardar Plano'}
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

