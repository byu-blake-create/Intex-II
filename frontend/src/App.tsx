import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Public pages
import HomePage from './pages/public/HomePage'
import ImpactPage from './pages/public/ImpactPage'
import LoginPage from './pages/public/LoginPage'
import PrivacyPolicyPage from './pages/public/PrivacyPolicyPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import DonorsPage from './pages/admin/DonorsPage'
import CaseloadPage from './pages/admin/CaseloadPage'
import ProcessRecordingPage from './pages/admin/ProcessRecordingPage'
import VisitationsPage from './pages/admin/VisitationsPage'
import ReportsPage from './pages/admin/ReportsPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* Admin / Staff (require authentication) */}
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/donors" element={<ProtectedRoute><DonorsPage /></ProtectedRoute>} />
        <Route path="/admin/caseload" element={<ProtectedRoute><CaseloadPage /></ProtectedRoute>} />
        <Route path="/admin/process-recording" element={<ProtectedRoute><ProcessRecordingPage /></ProtectedRoute>} />
        <Route path="/admin/visitations" element={<ProtectedRoute><VisitationsPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}
