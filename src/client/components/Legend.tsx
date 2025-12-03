import { CATEGORY_META, STATUS_META } from '../constants'

const Legend = () => {
  return (
    <div className="legend-card">
      <div>
        <p className="legend-card__title">Estado de los stands</p>
        <div className="legend-card__chips">
          {Object.entries(STATUS_META).map(([status, meta]) => (
            <span key={status} className="chip" style={{ borderColor: meta.color }}>
              <span className="chip__dot" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="legend-card__title">Categorías</p>
        <div className="legend-card__chips">
          {Object.entries(CATEGORY_META).map(([id, meta]) => (
            <span key={id} className="chip chip--soft" style={{ backgroundColor: `${meta.color}22` }}>
              <span className="chip__dot" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Legend


