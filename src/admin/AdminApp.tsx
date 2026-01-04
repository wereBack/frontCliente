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
        <div className="admin-layout">
            {/* Top Header */}
            <header className="admin-header">
                <div className="admin-header__brand">
                    <span className="admin-header__logo">🗺️</span>
                    <div>
                        <h1 className="admin-header__title">Admin - Reserva Espacios</h1>
                        <p className="admin-header__subtitle">Editor de planos interactivo</p>
                    </div>
                </div>
                <div className="admin-header__user">
                    <span className="admin-header__user-name">
                        Hola, <strong>{user?.name || 'Admin'}</strong>
                    </span>
                    <button onClick={logout} className="admin-header__logout">
                        Cerrar sesión
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="admin-content">
                {/* Left Sidebar - Toolbar */}
                <aside className="admin-sidebar">
                    <Toolbar onBackgroundChange={handleBackgroundChange} />
                </aside>

                {/* Center - Workspace */}
                <main className="admin-workspace">
                    {/* Header with Event and Plano selectors */}
                    <div className="workspace-header">
                        <EventSelector />
                    </div>

                    {/* Canvas Area */}
                    <div className="canvas-container">
                        <div className="canvas-wrapper">
                            <StandCanvas backgroundSrc={backgroundUrl} />
                        </div>
                    </div>
                </main>

                {/* Right Panel - Inspector */}
                <aside className="admin-inspector">
                    <PendingReservations />
                    <StandInspector />
                </aside>
            </div>
        </div>
    )
}

export default AdminApp
