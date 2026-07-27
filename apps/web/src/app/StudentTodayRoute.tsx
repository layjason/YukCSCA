import { useAuth } from '@/features/auth/useAuth';
import { useConsumer } from '@/prototype/consumer/state/consumerContext';
import { TodayPage } from '@/prototype/student/today/TodayPage';

export function StudentTodayRoute(): React.JSX.Element {
  const { status, user } = useAuth();
  const { state } = useConsumer();
  const previewName = state.credentialSession.displayEmail.split('@')[0] ?? '';
  const displayName = status === 'authenticated' ? (user?.displayName ?? '') : previewName;

  return <TodayPage {...(displayName ? { displayName } : {})} />;
}
