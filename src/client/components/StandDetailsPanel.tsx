import type { FloorStand, StandStatus } from '../../types/stands'
import { formatCurrency, STATUS_META } from '../constants'

type StandDetailsPanelProps = {
  stand?: FloorStand
  status?: StandStatus
  reservationCompany?: string
  onRelease: () => void
}

const StandDetailsPanel = ({
  stand,
  status,
  reservationCompany,
  onRelease,
}: StandDetailsPanelProps) => {
  if (!stand) {
    return (
      <div className="panel-card empty">
        <p>Seleccioná un stand en el mapa para ver los detalles.</p>
      </div>
    )
  }

  const meta = status ? STATUS_META[status] : STATUS_META[stand.status]

  return (
    <div className="panel-card">
      <header className="panel-card__header">
        <div>
          <p className="stand-label">{stand.label}</p>
          <p className="stand-title">{stand.description ?? 'Stand disponible para reserva.'}</p>
        </div>
        <span className="status-pill" style={{ backgroundColor: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
      </header>

      <dl className="stand-meta">
        <div>
          <dt>Dimensiones</dt>
          <dd>{stand.size}</dd>
        </div>
        <div>
          <dt>Categoría</dt>
          <dd className={`tag tag--${stand.category}`}>{stand.category}</dd>
        </div>
        <div>
          <dt>Precio</dt>
          <dd>{formatCurrency(stand.price)} + IVA</dd>
        </div>
      </dl>

      {stand.highlight ? <p className="stand-highlight">✨ {stand.highlight}</p> : null}

      {status === 'reservado' && reservationCompany ? (
        <div className="reservation-info">
          <p>Reservado por</p>
          <strong>{reservationCompany}</strong>
          <button type="button" className="link-btn" onClick={onRelease}>
            Liberar stand
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default StandDetailsPanel


