import type { Stand } from '../store/standStore'
import { useStandStore } from '../store/standStore'

const StandInspector = () => {
  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const selectStand = useStandStore((state) => state.selectStand)
  const updateStand = useStandStore((state) => state.updateStand)
  const removeStand = useStandStore((state) => state.removeStand)
  const removeZone = useStandStore((state) => state.removeZone)

  const handleColorChange = (stand: Stand, color: string) => {
    updateStand(stand.id, { color })
  }

  const handleLabelChange = (stand: Stand, label: string) => {
    updateStand(stand.id, { label: label.trim() === '' ? undefined : label })
  }

  return (
    <aside className="inspector">
      <div className="inspector__header">
        <div>
          <p className="inspector__title">Stands</p>
          <small>{stands.length} creados</small>
        </div>
      </div>

      {stands.length === 0 ? (
        <p className="inspector__empty">
          Dibujá tus primeros stands ☝️ con las herramientas de la izquierda.
        </p>
      ) : (
        <ul className="inspector__list">
          {stands.map((stand, index) => (
            <li
              key={stand.id}
              className={`inspector__item ${
                selectedStandId === stand.id ? 'inspector__item--active' : ''
              }`}
            >
              <button
                className="inspector__item-main"
                onClick={() => selectStand(stand.id)}
              >
                <span className="inspector__item-name">
                  {stand.label ?? `Stand ${index + 1}`}
                </span>
                <span className="inspector__badge">{stand.kind}</span>
              </button>

              <div className="inspector__item-body">
                <label className="inspector__field">
                  Nombre
                  <input
                    className="inspector__input"
                    placeholder={`Stand ${index + 1}`}
                    value={stand.label ?? ''}
                    onChange={(event) =>
                      handleLabelChange(stand, event.target.value)
                    }
                  />
                </label>
                <div className="inspector__meta">
                  <span>{formatStandMeta(stand)}</span>
                </div>
                <label className="inspector__color">
                  Color
                  <input
                    type="color"
                    value={stand.color}
                    onChange={(event) =>
                      handleColorChange(stand, event.target.value)
                    }
                  />
                </label>
                <button
                  className="inspector__delete"
                  onClick={() => removeStand(stand.id)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="inspector__zones">
        <p className="inspector__title">Zonas ({zones.length})</p>
        {zones.length === 0 ? (
          <p className="inspector__empty inspector__empty--compact">
            Aún no marcaste zonas.
          </p>
        ) : (
          <ul className="inspector__zone-list">
            {zones.map((zone, index) => (
              <li key={zone.id} className="inspector__zone-row">
                <span
                  className="inspector__zone-dot"
                  style={{ backgroundColor: zone.color }}
                />
                <span className="inspector__zone-label">Zona {index + 1}</span>
                <button
                  className="inspector__zone-delete"
                  onClick={() => removeZone(zone.id)}
                  aria-label="Eliminar zona"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}

const formatStandMeta = (stand: Stand) => {
  if (stand.kind === 'rect') {
    return `${Math.round(stand.width)}×${Math.round(stand.height)} px`
  }
  if (stand.kind === 'free') {
    return `${Math.round(stand.points.length / 2)} pts`
  }
  return `${Math.round(stand.points.length / 2)} vértices`
}

export default StandInspector

