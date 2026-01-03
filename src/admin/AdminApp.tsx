import { useState } from 'react'
import StandCanvas from './components/StandCanvas'
import StandInspector from './components/StandInspector'
import Toolbar from './components/Toolbar'
import { useAuth } from '../auth/AuthContext'
import './admin.css'

const AdminApp = () => {
    const [backgroundSrc, setBackgroundSrc] = useState<string>()
    const { user, logout } = useAuth()

    return (
        <div className="app-shell">
            <Toolbar onBackgroundChange={setBackgroundSrc} />

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
                        <ul className="workspace__tips">
                            <li>Rectángulo: clic y arrastrá para definir el área.</li>
                            <li>Polígono: agregá vértices con clic y cerrá con doble clic.</li>
                            <li>Trazo libre: mantené presionado para dibujar formas orgánicas.</li>
                            <li>Pintar zona: clic sobre un stand para aplicar el color activo.</li>
                            <li>Las zonas se dibujan desde la segunda sección del panel izquierdo.</li>
                        </ul>
                    </div>
                </header>

                <section className="workspace__canvas">
                    <StandCanvas backgroundSrc={backgroundSrc} />
                </section>
            </main>

            <StandInspector />
        </div>
    )
}

export default AdminApp
