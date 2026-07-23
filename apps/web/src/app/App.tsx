import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '@/app/guards/AuthGuard';
import { RoleGuard } from '@/app/guards/RoleGuard';
import { PreviewOnboardingGuard } from '@/app/guards/PreviewOnboardingGuard';
import { PreviewWorkspaceGuard } from '@/app/guards/PreviewWorkspaceGuard';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { OnboardingLayout } from '@/app/layouts/OnboardingLayout';
import { AppShellLayout } from '@/app/layouts/AppShellLayout';
import { UnsupportedRolePage } from '@/app/layouts/UnsupportedRolePage';
import { StudentMorePage } from '@/app/layouts/StudentMorePage';
import { useAuth } from '@/features/auth/useAuth';
import { usePrototype } from '@/prototype/student/prototypeContext';
import LoginPage from '@/features/auth/LoginPage';
import StudentActivationPage from '@/features/onboarding/student-activation/StudentActivationPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { GoalsPage } from '@/prototype/student/onboarding/GoalsPage';
import { SubjectsPage } from '@/prototype/student/onboarding/SubjectsPage';
import { DiagnosticPage } from '@/prototype/student/onboarding/DiagnosticPage';
import { DiagnosticResultPage } from '@/prototype/student/onboarding/DiagnosticResultPage';
import { PlanReviewPage } from '@/prototype/student/onboarding/PlanReviewPage';
import { TodayPage } from '@/prototype/student/today/TodayPage';
import { LearnPage } from '@/prototype/student/learning/LearnPage';
import { SyllabusPage } from '@/prototype/student/learning/SyllabusPage';
import { LessonPage } from '@/prototype/student/learning/LessonPage';
import { PracticePage } from '@/prototype/student/practice/PracticePage';
import { PracticeSessionPage } from '@/prototype/student/practice/PracticeSessionPage';
import { PracticeResultPage } from '@/prototype/student/practice/PracticeResultPage';
import { MistakesPage } from '@/prototype/student/practice/MistakesPage';
import { MistakeDetailPage } from '@/prototype/student/practice/MistakeDetailPage';
import { MockExamListPage } from '@/prototype/student/mock-exam/MockExamListPage';
import { MockInstructionsPage } from '@/prototype/student/mock-exam/MockInstructionsPage';
import { MockSessionPage } from '@/prototype/student/mock-exam/MockSessionPage';
import { MockResultPage } from '@/prototype/student/mock-exam/MockResultPage';
import { ProgressPage } from '@/prototype/student/progress/ProgressPage';
import { LanguagesPage } from '@/prototype/student/settings/LanguagesPage';
import { FamilyPage } from '@/prototype/student/settings/FamilyPage';
import { AccessPage } from '@/prototype/student/settings/AccessPage';

export default function App(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route path="/unsupported" element={<UnsupportedRolePage />} />

      <Route element={<AuthGuard />}>
        <Route element={<OnboardingLayout />}>
          <Route path="/onboarding/student" element={<StudentActivationPage />} />
          <Route element={<PreviewOnboardingGuard />}>
            <Route path="/onboarding/student/goals" element={<GoalsPage />} />
            <Route path="/onboarding/student/subjects" element={<SubjectsPage />} />
            <Route path="/onboarding/student/diagnostic" element={<DiagnosticPage />} />
            <Route
              path="/onboarding/student/diagnostic/result"
              element={<DiagnosticResultPage />}
            />
            <Route path="/onboarding/student/plan-review" element={<PlanReviewPage />} />
          </Route>
        </Route>

        <Route element={<RoleGuard />}>
          <Route element={<PreviewWorkspaceGuard />}>
            <Route element={<AppShellLayout />}>
              <Route path="/app/today" element={<TodayPage />} />
              <Route path="/app/learn" element={<LearnPage />} />
              <Route path="/app/learn/syllabus" element={<SyllabusPage />} />
              <Route path="/app/learn/:lessonId" element={<LessonPage />} />
              <Route path="/app/practice" element={<PracticePage />} />
              <Route path="/app/practice/mistakes" element={<MistakesPage />} />
              <Route path="/app/practice/mistakes/:mistakeId" element={<MistakeDetailPage />} />
              <Route path="/app/practice/:sessionId" element={<PracticeSessionPage />} />
              <Route path="/app/practice/:sessionId/result" element={<PracticeResultPage />} />
              <Route path="/app/mock-exams" element={<MockExamListPage />} />
              <Route
                path="/app/mock-exams/:examId/instructions"
                element={<MockInstructionsPage />}
              />
              <Route path="/app/mock-exams/:examId/session" element={<MockSessionPage />} />
              <Route path="/app/mock-exams/:examId/result" element={<MockResultPage />} />
              <Route path="/app/progress" element={<ProgressPage />} />
              <Route path="/app/profile" element={<ProfilePage />} />
              <Route path="/app/profile/languages" element={<LanguagesPage />} />
              <Route path="/app/profile/family" element={<FamilyPage />} />
              <Route path="/app/profile/access" element={<AccessPage />} />
              <Route path="/app/more" element={<StudentMorePage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RootRedirect(): React.JSX.Element {
  const { status, user } = useAuth();
  const { state } = usePrototype();

  if (status === 'loading') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'UNASSIGNED') {
    return <Navigate to="/onboarding/student" replace />;
  }

  if (user?.role !== 'STUDENT') {
    return <Navigate to="/unsupported" replace />;
  }

  if (state.onboardingStep !== 'complete') {
    return <Navigate to="/onboarding/student/goals" replace />;
  }

  return <Navigate to="/app/today" replace />;
}
