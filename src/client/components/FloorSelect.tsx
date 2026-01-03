import type { FloorMeta } from '../../types/stands'

type FloorSelectProps = {
  floors: FloorMeta[]
  activeId: string
  onSelect: (id: string) => void
}

const FloorSelect = ({ floors, activeId, onSelect }: FloorSelectProps) => {
  if (floors.length <= 1) return null

  return (
    <label className="floor-select">
      <span>Plano / piso</span>
      <select value={activeId} onChange={(event) => onSelect(event.target.value)}>
        {floors.map((floor) => (
          <option key={floor.id} value={floor.id}>
            {floor.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export default FloorSelect





