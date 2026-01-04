import { useState } from 'react'
import type { Stand, Zone } from '../store/standStore'
import { useStandStore } from '../store/standStore'
import { updateSpace, updateZone as updateZoneApi } from '../services/api'

const StandInspector = () => {
  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const removeStand = useStandStore((state) => state.removeStand)
  const removeZone = useStandStore((state) => state.removeZone)
  const planoId = useStandStore((state) => state.planoId)

  const [savingStandId, setSavingStandId] = useState<string | null>(null)
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null)
  const [expandedStandId, setExpandedStandId] = useState<string | null>(null)

  const handleLabelChange = (stand: Stand, label: string) => {
    updateStand(stand.id, { label: label.trim() === '' ? undefined : label })
  }

  const handlePriceChange = (stand: Stand, priceStr: string) => {
    const price = priceStr === '' ? undefined : parseFloat(priceStr)
    updateStand(stand.id, { price })
  }

  const handleZonePriceChange = (zone: Zone, priceStr: string) => {
    const price = priceStr === '' ? undefined : parseFloat(priceStr)
    updateZone(zone.id, { price })
  }

  const handleZoneLabelChange = (zone: Zone, label: string) => {
    updateZone(zone.id, { label: label.trim() === '' ? undefined : label })
  }

  const handleSaveStand = async (stand: Stand, index: number) => {
    if (!planoId) {
      alert('Primero guarda el plano para poder guardar cambios individuales')
      return
    }
    setSavingStandId(stand.id)
    try {
      await updateSpace(stand.id, {
        name: stand.label || `Stand ${index + 1}`,
        price: stand.price ?? null,
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSavingStandId(null)
    }
  }

  const handleSaveZone = async (zone: Zone, index: number) => {
    if (!planoId) {
      alert('Primero guarda el plano para poder guardar cambios individuales')
      return
    }
    setSavingZoneId(zone.id)
    try {
      await updateZoneApi(zone.id, {
        name: zone.label || `Zona ${index + 1}`,
        price: zone.price ?? null,
        color: zone.color,
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSavingZoneId(null)
    }
  }

  const toggleExpand = (standId: string) => {
    setExpandedStandId(expandedStandId === standId ? null : standId)
    selectStand(standId)
  }

  return (
    <>
      {/* Stands Section */}
      <div className="inspector-section">
        <div className="inspector-section__header">
          <h3>Stands</h3>
          <span className="inspector-section__count">{stands.length}</span>
        </div>

        {stands.length === 0 ? (
          <p className="inspector-section__empty">
            Dibujá stands con las herramientas de la izquierda
          </p>
        ) : (
          <div className="inspector-list">
            {stands.map((stand, index) => {
              const isExpanded = expandedStandId === stand.id || selectedStandId === stand.id
              return (
                <div
                  key={stand.id}
                  className={`inspector-item ${isExpanded ? 'inspector-item--expanded' : ''}`}
                >
                  {/* Header - always visible */}
                  <button
                    className="inspector-item__header"
                    onClick={() => toggleExpand(stand.id)}
                  >
                    <div className="inspector-item__title">
                      <span className="inspector-item__icon">◼</span>
                      <span className="inspector-item__name">
                        {stand.label || `Stand ${index + 1}`}
                      </span>
                    </div>
                    <div className="inspector-item__meta">
                      {stand.price != null && (
                        <span className="inspector-item__price">${stand.price}</span>
                      )}
                      <span className="inspector-item__type">{stand.kind}</span>
                      <span className="inspector-item__chevron">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="inspector-item__body">
                      <div className="inspector-field">
                        <label>Nombre</label>
                        <input
                          type="text"
                          placeholder={`Stand ${index + 1}`}
                          value={stand.label ?? ''}
                          onChange={(e) => handleLabelChange(stand, e.target.value)}
                        />
                      </div>

                      <div className="inspector-field">
                        <label>Precio (US$)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={stand.price ?? ''}
                          onChange={(e) => handlePriceChange(stand, e.target.value)}
                        />
                      </div>

                      <div className="inspector-item__info">
                        {formatStandMeta(stand)}
                      </div>

                      <div className="inspector-item__actions">
                        <button
                          className="inspector-btn inspector-btn--save"
                          onClick={() => handleSaveStand(stand, index)}
                          disabled={savingStandId === stand.id || !planoId}
                        >
                          {savingStandId === stand.id ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          className="inspector-btn inspector-btn--delete"
                          onClick={() => removeStand(stand.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Zones Section */}
      <div className="inspector-section">
        <div className="inspector-section__header">
          <h3>Zonas</h3>
          <span className="inspector-section__count">{zones.length}</span>
        </div>

        {zones.length === 0 ? (
          <p className="inspector-section__empty">
            Usá las herramientas de zona para crear áreas
          </p>
        ) : (
          <div className="inspector-list">
            {zones.map((zone, index) => (
              <div key={zone.id} className="zone-card">
                <div
                  className="zone-card__color"
                  style={{ backgroundColor: zone.color }}
                />
                <div className="zone-card__content">
                  <input
                    className="zone-card__name"
                    type="text"
                    placeholder={`Zona ${index + 1}`}
                    value={zone.label ?? ''}
                    onChange={(e) => handleZoneLabelChange(zone, e.target.value)}
                  />
                  <div className="zone-card__row">
                    <div className="zone-card__field">
                      <label>Precio</label>
                      <input
                        type="number"
                        placeholder="US$"
                        value={zone.price ?? ''}
                        onChange={(e) => handleZonePriceChange(zone, e.target.value)}
                      />
                    </div>
                    <div className="zone-card__field">
                      <label>Color</label>
                      <input
                        type="color"
                        value={zone.color}
                        onChange={(e) => updateZone(zone.id, { color: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="zone-card__actions">
                  <button
                    className="zone-card__btn zone-card__btn--save"
                    onClick={() => handleSaveZone(zone, index)}
                    disabled={savingZoneId === zone.id || !planoId}
                    title="Guardar"
                  >
                    {savingZoneId === zone.id ? '...' : '💾'}
                  </button>
                  <button
                    className="zone-card__btn zone-card__btn--delete"
                    onClick={() => removeZone(zone.id)}
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const formatStandMeta = (stand: Stand) => {
  if (stand.kind === 'rect') {
    return `Tamaño: ${Math.round(stand.width)}×${Math.round(stand.height)} px`
  }
  if (stand.kind === 'free') {
    return `Puntos: ${Math.round(stand.points.length / 2)}`
  }
  return `Vértices: ${Math.round(stand.points.length / 2)}`
}

export default StandInspector
