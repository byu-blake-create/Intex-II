import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import CookieConsent from './components/CookieConsent'

// Public pages — lightweight, keep eager
import HomePage from './pages/public/HomePage'
import LoginPage from './pages/public/LoginPage'

// Staff pages
import AdminDashboard from './pages/admin/AdminDashboard'
import DonorsPage from './pages/admin/DonorsPage'
import CaseloadPage from './pages/admin/CaseloadPage'
import ProcessRecordingPage from './pages/admin/ProcessRecordingPage'
import VisitationsPage from './pages/admin/VisitationsPage'
import ReportsPage from './pages/admin/ReportsPage'
import SocialSuitePage from './pages/admin/SocialSuitePage'

export default function App() {
  return (
    <AuthProvider>
      <CookieConsent />
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>}>
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
        <Route path="/staff/social" element={<ProtectedRoute><SocialSuitePage /></ProtectedRoute>} />

        {/* Keep older links working while the app standardizes on /staff. */}
        <Route path="/admin" element={<Navigate to="/staff" replace />} />
        <Route path="/admin/donors" element={<Navigate to="/staff/donors" replace />} />
        <Route path="/admin/caseload" element={<Navigate to="/staff/caseload" replace />} />
        <Route path="/admin/process-recording" element={<Navigate to="/staff/process-recording" replace />} />
        <Route path="/admin/visitations" element={<Navigate to="/staff/visitations" replace />} />
        <Route path="/admin/reports" element={<Navigate to="/staff/reports" replace />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  )
}
