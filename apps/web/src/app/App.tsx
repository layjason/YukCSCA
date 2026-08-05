import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '@/app/guards/AuthGuard';
import { PreviewOnboardingGuard } from '@/app/guards/PreviewOnboardingGuard';
import { PreviewWorkspaceGuard } from '@/app/guards/PreviewWorkspaceGuard';
import { PreviewContextGuard } from '@/app/guards/PreviewContextGuard';
import { RoleSelectionGuard } from '@/app/guards/RoleSelectionGuard';
import { ParentOnboardingGuard } from '@/app/guards/ParentOnboardingGuard';
import { StudentExperienceGuard } from '@/app/guards/StudentExperienceGuard';
import { AdminGuard } from '@/app/guards/AdminGuard';
import { PublicSiteLayout } from '@/app/layouts/PublicSiteLayout';
import AcademicAdminDashboardPage from '@/features/academic-admin/AcademicAdminDashboardPage';
import AcademicPackageDetailPage from '@/features/academic-admin/AcademicPackageDetailPage';
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
import { LanguagesPage } from '@/features/profile/LanguagesPage';
import { FamilyPage } from '@/prototype/student/settings/FamilyPage';
import { AccessPage } from '@/prototype/student/settings/AccessPage';
import { ProductsPage } from '@/prototype/consumer/public/ProductsPage';
import { ProductDetailPage } from '@/prototype/consumer/public/ProductDetailPage';
import { TrialPage } from '@/prototype/consumer/public/TrialPage';
import { ForParentsPage } from '@/prototype/consumer/public/ForParentsPage';
import { PrivacyPage } from '@/prototype/consumer/public/PrivacyPage';
import { TermsPage } from '@/prototype/consumer/public/TermsPage';
import { AccountVerificationPage } from '@/app/AccountVerificationPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
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
import { getRouteById, routesForAccess, type RouteAccess, type RouteId } from '@/app/routes';

export default function App(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<PublicSiteLayout />}>{renderRoutes('public')}</Route>

      {renderRoutes('unsupported')}

      <Route element={<RoleSelectionGuard />}>{renderRoutes('role-selection')}</Route>
      <Route element={<ParentOnboardingGuard />}>{renderRoutes('parent-onboarding')}</Route>

      <Route element={<PreviewContextGuard scope="parent" />}>
        <Route element={<ParentShellLayout />}>{renderRoutes('parent-preview')}</Route>
      </Route>

      <Route element={<PreviewContextGuard scope="commerce" />}>
        {renderRoutes('commerce-preview')}
      </Route>

      <Route element={<PreviewContextGuard />}>{renderRoutes('preview-context')}</Route>

      <Route element={<AuthGuard />}>
        <Route element={<OnboardingLayout />}>{renderRoutes('production-auth')}</Route>
      </Route>

      <Route element={<StudentExperienceGuard />}>
        <Route element={<AppShellLayout />}>{renderRoutes('student-settings')}</Route>

        <Route element={<OnboardingLayout />}>
          <Route element={<PreviewOnboardingGuard />}>
            {renderRoutes('student-onboarding-preview')}
          </Route>
        </Route>

        <Route element={<PreviewWorkspaceGuard />}>
          <Route element={<AppShellLayout />}>{renderRoutes('student-workspace-preview')}</Route>
        </Route>
      </Route>

      <Route element={<AdminGuard />}>{renderRoutes('admin-workspace')}</Route>

      <Route path="*" element={<Navigate to={getRouteById('home').path} replace />} />
    </Routes>
  );
}

const routeElements = {
  home: <RootDecisionPage />,
  products: <ProductsPage />,
  'product-detail': <ProductDetailPage />,
  trial: <TrialPage />,
  'for-parents': <ForParentsPage />,
  privacy: <PrivacyPage />,
  terms: <TermsPage />,
  register: <AccountRegistrationPage />,
  login: <AccountEntryPage />,
  'verify-email': <AccountVerificationPage />,
  'forgot-password': <ForgotPasswordPage />,
  'reset-password': <ResetPasswordPage />,
  'credential-login': <Navigate to={getRouteById('login').path} replace />,
  unsupported: <UnsupportedRolePage />,
  'role-selection': <RoleSelectionPage />,
  'parent-onboarding': <ParentOnboardingPage />,
  'student-activation': <StudentActivationPage />,
  'parent-home': <ParentHomePage />,
  'parent-family': <ConsumerFamilyPage />,
  'parent-family-create-student': <CreateStudentPage />,
  'parent-invitation': <InvitationPage />,
  'parent-reports': <ParentReportsIndexPage />,
  'parent-student': <StudentOverviewPage />,
  'parent-student-report': <ParentReportPage />,
  'parent-purchases': <EntitlementsPage />,
  'parent-orders': <OrdersPage />,
  'parent-order-detail': <OrderDetailPage />,
  'parent-account': <AccountPrivacyPage />,
  'parent-notifications': <NotificationPrefsPage />,
  'parent-account-privacy': <AccountPrivacyPage />,
  'parent-support': <SupportPage />,
  checkout: <CheckoutPage />,
  'checkout-payment': <CheckoutPaymentPage />,
  'checkout-instructions': <CheckoutInstructionsPage />,
  orders: <OrdersPage />,
  'order-detail': <OrderDetailPage />,
  'order-refund': <RefundPage />,
  entitlements: <EntitlementsPage />,
  'entitlement-renew': <EntitlementRenewPage />,
  'account-notifications': <NotificationPrefsPage />,
  'account-privacy': <AccountPrivacyPage />,
  'account-export': <AccountExportPage />,
  'account-delete': <AccountDeletePage />,
  support: <SupportPage />,
  'support-new': <SupportNewPage />,
  'support-ticket': <SupportTicketPage />,
  'onboarding-goals': <GoalsPage />,
  'onboarding-subjects': <SubjectsPage />,
  'onboarding-diagnostic': <DiagnosticPage />,
  'onboarding-diagnostic-result': <DiagnosticResultPage />,
  'onboarding-plan-review': <PlanReviewPage />,
  today: <StudentTodayRoute />,
  learn: <LearnPage />,
  'learn-syllabus': <SyllabusPage />,
  'learn-lesson': <LessonPage />,
  practice: <PracticePage />,
  'practice-session': <PracticeSessionPage />,
  'practice-result': <PracticeResultPage />,
  'practice-mistakes': <MistakesPage />,
  'practice-mistake-detail': <MistakeDetailPage />,
  'mock-exams': <MockExamListPage />,
  'mock-instructions': <MockInstructionsPage />,
  'mock-session': <MockSessionPage />,
  'mock-result': <MockResultPage />,
  progress: <ProgressPage />,
  profile: <StudentProfileRoute />,
  'profile-languages': <LanguagesPage />,
  'profile-family': <FamilyPage />,
  'profile-access': <AccessPage />,
  more: <StudentMorePage />,
  'admin-packages': <AcademicAdminDashboardPage />,
  'admin-package-detail': <AcademicPackageDetailPage />,
} satisfies Record<RouteId, React.JSX.Element>;

function renderRoutes(access: RouteAccess): React.JSX.Element[] {
  return routesForAccess(access).map((route) => (
    <Route key={route.id} path={route.path} element={routeElements[route.id]} />
  ));
}
