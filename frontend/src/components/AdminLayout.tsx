import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AdminLayout.css'

const links = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/caseload', label: 'Caseload' },
  { to: '/admin/donors', label: 'Donors' },
  { to: '/admin/process-recording', label: 'Process recording' },
  { to: '/admin/visitations', label: 'Visitations' },
  { to: '/admin/reports', label: 'Reports' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="admin-layout">
      <header className="admin-layout__header">
        <Link to="/admin" className="admin-layout__brand">
          North Star Shelter
        </Link>
        <nav className="admin-layout__nav" aria-label="Admin">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/admin'}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-layout__user">
          <span className="admin-layout__email">{user?.email}</span>
          <button type="button" className="admin-layout__logout" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>
      <div className="admin-layout__body">{children}</div>
    </div>
  )
}
