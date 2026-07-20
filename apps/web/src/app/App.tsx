import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import DashboardPage from '@/features/dashboard/DashboardPage';
import LoginPage from '@/features/auth/LoginPage';

export default function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
