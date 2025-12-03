import type { FloorMeta } from '../../types/stands'

type FloorSwitcherProps = {
  floors: FloorMeta[]
  activeId: string
  onSelect: (id: string) => void
}

const FloorSwitcher = ({ floors, activeId, onSelect }: FloorSwitcherProps) => {
  if (floors.length <= 1) {
    return null
  }

  return (
    <div className="floor-switcher">
      {floors.map((floor) => (
        <button
          key={floor.id}
          type="button"
          className={floor.id === activeId ? 'floor-switcher__btn active' : 'floor-switcher__btn'}
          onClick={() => onSelect(floor.id)}
        >
          <span>{floor.name}</span>
          <small>{floor.description}</small>
        </button>
      ))}
    </div>
  )
}

export default FloorSwitcher


