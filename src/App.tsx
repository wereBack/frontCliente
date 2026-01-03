import { useAuth } from './auth/AuthContext'
import ClientApp from './client/ClientApp'
import AdminApp from './admin/AdminApp'

const App = () => {
  const { isInitialized, isAuthenticated, hasRole } = useAuth()

  // Show loading while Keycloak initializes
  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    )
  }

  // If authenticated with Admin role, show admin panel
  if (isAuthenticated && hasRole('Admin')) {
    return <AdminApp />
  }

  // Default: show client view (public or with Cliente role)
  return <ClientApp />
}

export default App
