import { floors } from '../data/floors'
import { useClientStore } from '../store/clientStore'
import FloorSwitcher from './components/FloorSwitcher'
import StandMap from './components/StandMap'
import Legend from './components/Legend'
import StandDetailsPanel from './components/StandDetailsPanel'
import ReservationForm from './components/ReservationForm'
import StandList from './components/StandList'
import LastActionToast from './components/LastActionToast'
import './client.css'

const ClientApp = () => {
  const floorId = useClientStore((state) => state.floorId)
  const selectFloor = useClientStore((state) => state.selectFloor)
  const statuses = useClientStore((state) => state.statuses)
  const selectedStandId = useClientStore((state) => state.selectedStandId)
  const selectStand = useClientStore((state) => state.selectStand)
  const reservations = useClientStore((state) => state.reservations)
  const releaseStand = useClientStore((state) => state.releaseStand)

  const activeFloor = floors.find((floor) => floor.id === floorId) ?? floors[0]
  const selectedStand = activeFloor?.stands.find((stand) => stand.id === selectedStandId)
  const currentStatus = selectedStand ? statuses[selectedStand.id] ?? selectedStand.status : undefined
  const reservation = selectedStand ? reservations[selectedStand.id] : undefined

  const availableCount = activeFloor
    ? activeFloor.stands.filter((stand) => (statuses[stand.id] ?? stand.status) === 'disponible').length
    : 0
  const reservedCount = activeFloor
    ? activeFloor.stands.filter((stand) => (statuses[stand.id] ?? stand.status) === 'reservado').length
    : 0

  return (
    <div className="client-app">
      <header className="client-hero">
        <div>
          <p className="eyebrow">Mapa interactivo</p>
          <h1>Elegí el stand ideal para tu empresa</h1>
          <p className="subtitle">
            Visualizá el plano del edificio, filtrá por categoría y confirmá tu reserva mock para la feria
            de empleo.
          </p>
        </div>

        <div className="hero-stats">
          <div>
            <p>Stands disponibles</p>
            <strong>{availableCount}</strong>
          </div>
          <div>
            <p>Reservados</p>
            <strong className="accent">{reservedCount}</strong>
          </div>
        </div>
      </header>

      <FloorSwitcher floors={floors} activeId={floorId} onSelect={selectFloor} />

      <main className="client-layout">
        <section className="client-layout__map">
          <StandMap
            floor={activeFloor}
            statuses={statuses}
            selectedStandId={selectedStandId}
            onSelect={selectStand}
          />
          <Legend />
        </section>

        <aside className="client-layout__panel">
          <StandDetailsPanel
            stand={selectedStand}
            status={currentStatus}
            reservationCompany={reservation?.companyName}
            onRelease={() => releaseStand(selectedStand?.id)}
          />
          <ReservationForm />
          <StandList
            stands={activeFloor.stands}
            statuses={statuses}
            selectedStandId={selectedStandId}
            onSelect={selectStand}
          />
        </aside>
      </main>

      <LastActionToast />
    </div>
  )
}

export default ClientApp


