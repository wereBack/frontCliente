import { floors } from '../data/floors'
import { useClientStore } from '../store/clientStore'
import { useAuth } from '../auth/AuthContext'
import FloorSwitcher from './components/FloorSwitcher'
import StandMap from './components/StandMap'
import Legend from './components/Legend'
import StandDetailsPanel from './components/StandDetailsPanel'
import ContactForm from './components/ContactForm'
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
  const reserveSelected = useClientStore((state) => state.reserveSelected)

  // Use Keycloak auth instead of mock
  const { isAuthenticated, user, login, logout } = useAuth()

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
        <div className="hero-row hero-row--top">
          <div className="session-actions">
            {isAuthenticated ? (
              <>
                <span className="badge">Hola, {user?.name || 'Usuario'}</span>
                <button type="button" className="ghost-btn" onClick={logout}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button type="button" className="ghost-btn" onClick={login}>
                  Iniciar sesión
                </button>
                <button type="button" className="ghost-btn ghost-btn--accent" onClick={login}>
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>

        <div className="hero-row hero-row--main">
          <div>
            <p className="eyebrow">Mapa interactivo</p>
            <h1>Elegí el stand ideal para tu empresa</h1>
            <p className="subtitle">
              Visualizá el plano del edificio, filtrá por categoría y confirmá tu reserva mock para la feria
              de empleo.
            </p>
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <p>Stands disponibles</p>
              <strong>{availableCount}</strong>
            </div>
            <div className="stat-card">
              <p>Reservados</p>
              <strong className="accent">{reservedCount}</strong>
            </div>
          </div>
        </div>
      </header>

      <FloorSwitcher floors={floors} activeId={floorId} onSelect={selectFloor} />

      <main className="client-flow">
        <section className="map-section">
          <div className="map-card">
            <StandMap
              floor={activeFloor}
              statuses={statuses}
              selectedStandId={selectedStandId}
              onSelect={selectStand}
            />
          </div>
          <Legend />
        </section>

        <section className="details-grid">
          <div className="details-column">
            <StandDetailsPanel
              stand={selectedStand}
              status={currentStatus}
              reservationCompany={reservation?.companyName}
              onRelease={() => releaseStand(selectedStand?.id)}
              onReserve={() => reserveSelected()}
              canReserve={
                isAuthenticated && !!selectedStand && currentStatus !== 'reservado' && currentStatus !== 'bloqueado'
              }
            />
          </div>
          <div className="details-column">
            <StandList
              stands={activeFloor.stands}
              statuses={statuses}
              selectedStandId={selectedStandId}
              onSelect={selectStand}
            />
          </div>
        </section>
      </main>

      <footer className="contact-footer">
        <ContactForm institutionEmail="contacto@feria.com" />
      </footer>

      <LastActionToast />
    </div>
  )
}

export default ClientApp


