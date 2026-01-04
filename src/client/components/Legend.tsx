import { STATUS_META } from '../constants'

interface ZoneData {
  id: string
  name: string
  color: string
}

interface LegendProps {
  zones?: ZoneData[]
}

const Legend = ({ zones = [] }: LegendProps) => {
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

      {zones.length > 0 && (
        <div>
          <p className="legend-card__title">Zonas</p>
          <div className="legend-card__chips">
            {zones.map((zone) => (
              <span 
                key={zone.id} 
                className="chip chip--soft" 
                style={{ backgroundColor: `${zone.color}22`, borderColor: zone.color }}
              >
                <span className="chip__dot" style={{ backgroundColor: zone.color }} />
                {zone.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Legend
