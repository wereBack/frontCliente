import StandCanvas from './components/StandCanvas'
import StandInspector from './components/StandInspector'
import Toolbar from './components/Toolbar'
import EventSelector from './components/EventSelector'
import PendingReservations from './components/PendingReservations'
import { useAuth } from '../auth/AuthContext'
import { useStandStore } from './store/standStore'
import './admin.css'

const AdminApp = () => {
    const { user, logout } = useAuth()
    const backgroundUrl = useStandStore((state) => state.backgroundUrl)
    const setBackgroundUrl = useStandStore((state) => state.setBackgroundUrl)

    const handleBackgroundChange = (src?: string) => {
        setBackgroundUrl(src || '')
    }

    return (
        <div className="app-shell">
            <Toolbar onBackgroundChange={handleBackgroundChange} />

            <main className="workspace">
                <header className="workspace__header">
                    <div>
                        <div className="workspace__user-bar">
                            <span>Hola, <strong>{user?.name || 'Admin'}</strong></span>
                            <button onClick={logout} className="logout-btn">Cerrar sesión</button>
                        </div>
                        <h1>Plano interactivo – Feria de Empleo</h1>
                        <p>
                            Cargá la imagen del predio, elegí una herramienta y dibujá los
                            stands. Usá el modo pintar para etiquetar zonas con colores según
                            el pricing que necesites.
                        </p>
                    </div>
                    <EventSelector />
                </header>

                <section className="workspace__canvas">
                    <StandCanvas backgroundSrc={backgroundUrl} />
                </section>
            </main>

            <aside className="inspector">
                <PendingReservations />
                <StandInspector />
            </aside>
        </div>
    )
}

export default AdminApp

