import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import DashboardPage from '@/features/dashboard/DashboardPage';
import LoginPage from '@/features/auth/LoginPage';
import { useAuth } from '@/features/auth/useAuth';
import StudentActivationPage from '@/features/onboarding/student-activation/StudentActivationPage';

export default function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding/student"
        element={
          <ProtectedRoute>
            <StudentActivationPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RoleHome(): React.JSX.Element {
  const { user } = useAuth();
  return user?.role === 'UNASSIGNED' ? (
    <Navigate to="/onboarding/student" replace />
  ) : (
    <DashboardPage />
  );
}
