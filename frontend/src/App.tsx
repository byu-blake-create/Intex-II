import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import CookieConsent from './components/CookieConsent'
import HashScrollManager from './components/HashScrollManager'

// Public pages — lightweight, keep eager
import HomePage from './pages/public/HomePage'
import LoginPage from './pages/public/LoginPage'

// Lazy-loaded pages — split into separate chunks
const ImpactPage = lazy(() => import('./pages/public/ImpactPage'))
const DonationsPage = lazy(() => import('./pages/public/DonationsPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const DonorsPage = lazy(() => import('./pages/admin/DonorsPage'))
const CaseloadPage = lazy(() => import('./pages/admin/CaseloadPage'))
const ProcessRecordingPage = lazy(() => import('./pages/admin/ProcessRecordingPage'))
const VisitationsPage = lazy(() => import('./pages/admin/VisitationsPage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const SocialSuitePage = lazy(() => import('./pages/admin/SocialSuitePage'))
const DatabasePage = lazy(() => import('./pages/admin/DatabasePage'))

export default function App() {
  return (
    <AuthProvider>
      <CookieConsent />
      <HashScrollManager />
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/impactDashboard" element={<Navigate to={{ pathname: '/', hash: '#impact-dashboard' }} replace />} />
        <Route path="/impact-dashboard" element={<Navigate to={{ pathname: '/', hash: '#impact-dashboard' }} replace />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/donations" element={<ProtectedRoute requiredRole="Donor"><DonationsPage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* Shared staff workspace */}
        <Route path="/staff" element={<ProtectedRoute requiredRole="Staff"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/staff/donors" element={<ProtectedRoute requiredRole="Staff"><DonorsPage /></ProtectedRoute>} />
        <Route path="/staff/caseload" element={<ProtectedRoute requiredRole="Staff"><CaseloadPage /></ProtectedRoute>} />
        <Route path="/staff/process-recording" element={<ProtectedRoute requiredRole="Staff"><ProcessRecordingPage /></ProtectedRoute>} />
        <Route path="/staff/visitations" element={<ProtectedRoute requiredRole="Staff"><VisitationsPage /></ProtectedRoute>} />
        <Route path="/staff/reports" element={<ProtectedRoute requiredRole="Staff"><ReportsPage /></ProtectedRoute>} />
        <Route path="/staff/social" element={<ProtectedRoute requiredRole="Staff"><SocialSuitePage /></ProtectedRoute>} />
        <Route path="/staff/database" element={<ProtectedRoute requiredRole="Admin"><DatabasePage /></ProtectedRoute>} />

        {/* Keep older links working while the app standardizes on /staff. */}
        <Route path="/admin" element={<Navigate to="/staff" replace />} />
        <Route path="/admin/donors" element={<Navigate to="/staff/donors" replace />} />
        <Route path="/admin/caseload" element={<Navigate to="/staff/caseload" replace />} />
        <Route path="/admin/process-recording" element={<Navigate to="/staff/process-recording" replace />} />
        <Route path="/admin/visitations" element={<Navigate to="/staff/visitations" replace />} />
        <Route path="/admin/reports" element={<Navigate to="/staff/reports" replace />} />
        <Route path="/admin/social" element={<Navigate to="/staff/social" replace />} />
        <Route path="/admin/database" element={<Navigate to="/staff/database" replace />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  )
}
