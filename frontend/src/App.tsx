import { Navigate, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import CookieConsent from './components/CookieConsent'

// Public pages
import HomePage from './pages/public/HomePage'
import ImpactPage from './pages/public/ImpactPage'
import LoginPage from './pages/public/LoginPage'
import PrivacyPolicyPage from './pages/public/PrivacyPolicyPage'

// Staff pages
import AdminDashboard from './pages/admin/AdminDashboard'
import DonorsPage from './pages/admin/DonorsPage'
import CaseloadPage from './pages/admin/CaseloadPage'
import ProcessRecordingPage from './pages/admin/ProcessRecordingPage'
import VisitationsPage from './pages/admin/VisitationsPage'
import ReportsPage from './pages/admin/ReportsPage'

export default function App() {
  return (
    <AuthProvider>
      <CookieConsent />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* Shared staff workspace */}
        <Route path="/staff" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/staff/donors" element={<ProtectedRoute><DonorsPage /></ProtectedRoute>} />
        <Route path="/staff/caseload" element={<ProtectedRoute><CaseloadPage /></ProtectedRoute>} />
        <Route path="/staff/process-recording" element={<ProtectedRoute><ProcessRecordingPage /></ProtectedRoute>} />
        <Route path="/staff/visitations" element={<ProtectedRoute><VisitationsPage /></ProtectedRoute>} />
        <Route path="/staff/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

        {/* Legacy route aliases */}
        <Route path="/admin" element={<Navigate to="/staff" replace />} />
        <Route path="/admin/donors" element={<Navigate to="/staff/donors" replace />} />
        <Route path="/admin/caseload" element={<Navigate to="/staff/caseload" replace />} />
        <Route path="/admin/process-recording" element={<Navigate to="/staff/process-recording" replace />} />
        <Route path="/admin/visitations" element={<Navigate to="/staff/visitations" replace />} />
        <Route path="/admin/reports" element={<Navigate to="/staff/reports" replace />} />
      </Routes>
    </AuthProvider>
  )
}
