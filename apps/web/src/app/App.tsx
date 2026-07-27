import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '@/app/guards/AuthGuard';
import { PreviewOnboardingGuard } from '@/app/guards/PreviewOnboardingGuard';
import { PreviewWorkspaceGuard } from '@/app/guards/PreviewWorkspaceGuard';
import { PreviewContextGuard } from '@/app/guards/PreviewContextGuard';
import { RoleSelectionGuard } from '@/app/guards/RoleSelectionGuard';
import { ParentOnboardingGuard } from '@/app/guards/ParentOnboardingGuard';
import { StudentExperienceGuard } from '@/app/guards/StudentExperienceGuard';
import { PublicSiteLayout } from '@/app/layouts/PublicSiteLayout';
import { OnboardingLayout } from '@/app/layouts/OnboardingLayout';
import { AppShellLayout } from '@/app/layouts/AppShellLayout';
import { ParentShellLayout } from '@/app/layouts/ParentShellLayout';
import { UnsupportedRolePage } from '@/app/layouts/UnsupportedRolePage';
import { StudentMorePage } from '@/app/layouts/StudentMorePage';
import StudentActivationPage from '@/features/onboarding/student-activation/StudentActivationPage';
import { RootDecisionPage } from '@/app/RootDecisionPage';
import { AccountEntryPage } from '@/app/AccountEntryPage';
import { AccountRegistrationPage } from '@/app/AccountRegistrationPage';
import { StudentProfileRoute } from '@/app/StudentProfileRoute';
import { StudentTodayRoute } from '@/app/StudentTodayRoute';
import { GoalsPage } from '@/prototype/student/onboarding/GoalsPage';
import { SubjectsPage } from '@/prototype/student/onboarding/SubjectsPage';
import { DiagnosticPage } from '@/prototype/student/onboarding/DiagnosticPage';
import { DiagnosticResultPage } from '@/prototype/student/onboarding/DiagnosticResultPage';
import { PlanReviewPage } from '@/prototype/student/onboarding/PlanReviewPage';
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
import { ProductsPage } from '@/prototype/consumer/public/ProductsPage';
import { ProductDetailPage } from '@/prototype/consumer/public/ProductDetailPage';
import { TrialPage } from '@/prototype/consumer/public/TrialPage';
import { ForParentsPage } from '@/prototype/consumer/public/ForParentsPage';
import { PrivacyPage } from '@/prototype/consumer/public/PrivacyPage';
import { TermsPage } from '@/prototype/consumer/public/TermsPage';
import { VerifyEmailPage } from '@/prototype/consumer/credential-auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/prototype/consumer/credential-auth/ForgotPasswordPage';
import { RoleSelectionPage } from '@/prototype/consumer/role-selection/RoleSelectionPage';
import { ParentOnboardingPage } from '@/prototype/consumer/parent/ParentOnboardingPage';
import { ParentHomePage } from '@/prototype/consumer/parent/ParentHomePage';
import { StudentOverviewPage } from '@/prototype/consumer/parent/StudentOverviewPage';
import { ParentReportPage } from '@/prototype/consumer/parent/ParentReportPage';
import { ParentReportsIndexPage } from '@/prototype/consumer/parent/ParentReportsIndexPage';
import { FamilyPage as ConsumerFamilyPage } from '@/prototype/consumer/family/FamilyPage';
import { CreateStudentPage } from '@/prototype/consumer/family/CreateStudentPage';
import { InvitationPage } from '@/prototype/consumer/family/InvitationPage';
import { CheckoutPage } from '@/prototype/consumer/commerce/CheckoutPage';
import { CheckoutPaymentPage } from '@/prototype/consumer/commerce/CheckoutPaymentPage';
import { CheckoutInstructionsPage } from '@/prototype/consumer/commerce/CheckoutInstructionsPage';
import { OrdersPage } from '@/prototype/consumer/commerce/OrdersPage';
import { OrderDetailPage } from '@/prototype/consumer/commerce/OrderDetailPage';
import { RefundPage } from '@/prototype/consumer/commerce/RefundPage';
import { EntitlementsPage } from '@/prototype/consumer/commerce/EntitlementsPage';
import { EntitlementRenewPage } from '@/prototype/consumer/commerce/EntitlementRenewPage';
import { NotificationPrefsPage } from '@/prototype/consumer/notifications/NotificationPrefsPage';
import { SupportPage } from '@/prototype/consumer/support/SupportPage';
import { SupportNewPage } from '@/prototype/consumer/support/SupportNewPage';
import { SupportTicketPage } from '@/prototype/consumer/support/SupportTicketPage';
import { AccountPrivacyPage } from '@/prototype/consumer/account/AccountPrivacyPage';
import { AccountExportPage } from '@/prototype/consumer/account/AccountExportPage';
import { AccountDeletePage } from '@/prototype/consumer/account/AccountDeletePage';

export default function App(): React.JSX.Element {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicSiteLayout />}>
        <Route path="/" element={<RootDecisionPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/trial" element={<TrialPage />} />
        <Route path="/for-parents" element={<ForParentsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/register" element={<AccountRegistrationPage />} />
        <Route path="/login" element={<AccountEntryPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/credential-login" element={<Navigate to="/login" replace />} />
      </Route>

      <Route path="/unsupported" element={<UnsupportedRolePage />} />

      {/* Role selection (requires Google UNASSIGNED or preview credential) */}
      <Route element={<RoleSelectionGuard />}>
        <Route path="/onboarding/role" element={<RoleSelectionPage />} />
      </Route>
      <Route element={<ParentOnboardingGuard />}>
        <Route path="/onboarding/parent" element={<ParentOnboardingPage />} />
      </Route>

      {/* Parent workspace requires completed Parent preview onboarding. */}
      <Route element={<PreviewContextGuard scope="parent" />}>
        <Route element={<ParentShellLayout />}>
          <Route path="/parent/home" element={<ParentHomePage />} />
          <Route path="/parent/family" element={<ConsumerFamilyPage />} />
          <Route path="/parent/family/create-student" element={<CreateStudentPage />} />
          <Route path="/parent/invitations/:invitationId" element={<InvitationPage />} />
          <Route path="/parent/reports" element={<ParentReportsIndexPage />} />
          <Route path="/parent/students/:studentId" element={<StudentOverviewPage />} />
          <Route path="/parent/students/:studentId/report" element={<ParentReportPage />} />
          <Route path="/parent/purchases" element={<EntitlementsPage />} />
          <Route path="/parent/orders" element={<OrdersPage />} />
          <Route path="/parent/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/parent/account" element={<AccountPrivacyPage />} />
          <Route path="/parent/account/notifications" element={<NotificationPrefsPage />} />
          <Route path="/parent/account/privacy" element={<AccountPrivacyPage />} />
          <Route path="/parent/support" element={<SupportPage />} />
        </Route>
      </Route>

      {/* Checkout requires Student-self or an active linked Parent recipient. */}
      <Route element={<PreviewContextGuard scope="commerce" />}>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />
      </Route>

      {/* Existing preview-persona state owns aftercare and account/support access. */}
      <Route element={<PreviewContextGuard />}>
        <Route path="/checkout/instructions" element={<CheckoutInstructionsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/orders/:orderId/refund" element={<RefundPage />} />
        <Route path="/entitlements" element={<EntitlementsPage />} />
        <Route path="/entitlements/:entitlementId/renew" element={<EntitlementRenewPage />} />

        {/* Shared account and support */}
        <Route path="/account/notifications" element={<NotificationPrefsPage />} />
        <Route path="/account/privacy" element={<AccountPrivacyPage />} />
        <Route path="/account/export" element={<AccountExportPage />} />
        <Route path="/account/delete" element={<AccountDeletePage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/support/new" element={<SupportNewPage />} />
        <Route path="/support/:ticketId" element={<SupportTicketPage />} />
      </Route>

      {/* Production-only student activation. */}
      <Route element={<AuthGuard />}>
        <Route element={<OnboardingLayout />}>
          <Route path="/onboarding/student" element={<StudentActivationPage />} />
        </Route>
      </Route>

      {/* Production Student or credential-preview Student may use PX-001 fixtures. */}
      <Route element={<StudentExperienceGuard />}>
        <Route element={<OnboardingLayout />}>
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

        <Route element={<PreviewWorkspaceGuard />}>
          <Route element={<AppShellLayout />}>
            <Route path="/app/today" element={<StudentTodayRoute />} />
            <Route path="/app/learn" element={<LearnPage />} />
            <Route path="/app/learn/syllabus" element={<SyllabusPage />} />
            <Route path="/app/learn/:lessonId" element={<LessonPage />} />
            <Route path="/app/practice" element={<PracticePage />} />
            <Route path="/app/practice/mistakes" element={<MistakesPage />} />
            <Route path="/app/practice/mistakes/:mistakeId" element={<MistakeDetailPage />} />
            <Route path="/app/practice/:sessionId" element={<PracticeSessionPage />} />
            <Route path="/app/practice/:sessionId/result" element={<PracticeResultPage />} />
            <Route path="/app/mock-exams" element={<MockExamListPage />} />
            <Route path="/app/mock-exams/:examId/instructions" element={<MockInstructionsPage />} />
            <Route path="/app/mock-exams/:examId/session" element={<MockSessionPage />} />
            <Route path="/app/mock-exams/:examId/result" element={<MockResultPage />} />
            <Route path="/app/progress" element={<ProgressPage />} />
            <Route path="/app/profile" element={<StudentProfileRoute />} />
            <Route path="/app/profile/languages" element={<LanguagesPage />} />
            <Route path="/app/profile/family" element={<FamilyPage />} />
            <Route path="/app/profile/access" element={<AccessPage />} />
            <Route path="/app/more" element={<StudentMorePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
