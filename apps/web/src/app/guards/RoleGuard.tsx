import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

export function RoleGuard(): React.JSX.Element {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'UNASSIGNED') {
    return <Navigate to="/onboarding/student" replace />;
  }

  if (user.role !== 'STUDENT') {
    return <Navigate to="/unsupported" replace />;
  }

  return <Outlet />;
}
