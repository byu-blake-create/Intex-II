import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth'

interface Props {
  children: React.ReactNode
  requiredRole?: string
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, loading } = useAuth()
  const hasRequiredRole = !requiredRole
    || user?.roles.includes(requiredRole)
    || (requiredRole === 'Staff' && user?.roles.includes('Admin'))

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (!hasRequiredRole) return <Navigate to="/" replace />

  return <>{children}</>
}
