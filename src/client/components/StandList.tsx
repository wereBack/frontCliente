import { useMemo, useState } from 'react'
import type { FloorStand, StandStatus } from '../../types/stands'
import { STATUS_META, formatCurrency } from '../constants'

type StandListProps = {
  stands: FloorStand[]
  statuses: Record<string, StandStatus>
  selectedStandId: string | null
  onSelect: (id: string) => void
}

const StandList = ({ stands, statuses, selectedStandId, onSelect }: StandListProps) => {
  const [filter, setFilter] = useState<'all' | StandStatus>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return stands.filter((stand) => {
      const status = statuses[stand.id] ?? stand.status
      if (filter !== 'all' && status !== filter) {
        return false
      }

      if (!search) return true
      const term = search.toLowerCase()
      return (
        stand.label.toLowerCase().includes(term) ||
        stand.description?.toLowerCase().includes(term) ||
        stand.category.toLowerCase().includes(term)
      )
    })
  }, [stands, statuses, filter, search])

  return (
    <div className="panel-card">
      <header className="panel-card__header">
        <div>
          <p className="stand-label">Explorar</p>
          <p className="stand-title">Listado de stands</p>
        </div>
      </header>

      <div className="list-filters">
        <input
          placeholder="Buscar por código o palabra clave"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select value={filter} onChange={(event) => setFilter(event.target.value as any)}>
          <option value="all">Todos</option>
          <option value="disponible">Disponibles</option>
          <option value="reservado">Reservados</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
      </div>

      <div className="stand-list">
        {filtered.map((stand) => {
          const status = statuses[stand.id] ?? stand.status
          const meta = STATUS_META[status]
          const isActive = selectedStandId === stand.id
          return (
            <button
              key={stand.id}
              type="button"
              className={isActive ? 'stand-item active' : 'stand-item'}
              onClick={() => onSelect(stand.id)}
            >
              <div>
                <p className="stand-item__label">{stand.label}</p>
                <p className="stand-item__desc">{stand.description ?? 'Sin descripción'}</p>
              </div>
              <div className="stand-item__meta">
                <span className="price">{formatCurrency(stand.price)}</span>
                <span className="status-pill" style={{ backgroundColor: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            </button>
          )
        })}

        {filtered.length === 0 ? (
          <p className="stand-list__empty">No encontramos resultados para tu búsqueda.</p>
        ) : null}
      </div>
    </div>
  )
}

export default StandList





