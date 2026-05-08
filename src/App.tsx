import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/toast'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import MainLayout from '@/components/layout/MainLayout'
import AuthPage from '@/components/auth/AuthPage'
import Dashboard from '@/components/dashboard/Dashboard'
import ProfilePage from '@/components/profile/ProfilePage'
import FriendsPage from '@/components/friends/FriendsPage'
import LobbyPage from '@/components/lobby/LobbyPage'
import MatchHistoryPage from '@/components/matches/MatchHistoryPage'
import AdminPage from '@/components/admin/AdminPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout><Dashboard /></MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <MainLayout><ProfilePage /></MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/profile/:userId" element={
                <ProtectedRoute>
                  <MainLayout><ProfilePage /></MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/friends" element={
                <ProtectedRoute>
                  <MainLayout><FriendsPage /></MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/lobby" element={
                <ProtectedRoute>
                  <MainLayout><LobbyPage /></MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/matches" element={
                <ProtectedRoute>
                  <MainLayout><MatchHistoryPage /></MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <MainLayout><AdminPage /></MainLayout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
