import type { TFunction } from 'i18next';
import type { Product, WeeklyReport } from './models/types';

export type LocalizedProduct = Omit<Product, 'examLanguage'> & {
  examLanguage: string;
};

function translated(t: TFunction, key: string, fallback: string): string {
  return t(key, { defaultValue: fallback });
}

export function localizeProduct(product: Product, t: TFunction): LocalizedProduct {
  const base = `prototypeData.products.${product.id}`;
  const modules = product.includedModules.map((module, index) => ({
    ...module,
    name: translated(t, `${base}.modules.${index + 1}`, module.name),
  }));

  return {
    ...product,
    name: translated(t, `${base}.name`, product.name),
    subject: translated(t, `${base}.subject`, product.subject),
    examLanguage: translated(t, `${base}.examLanguage`, product.examLanguage),
    intendedLearner: translated(t, `${base}.intendedLearner`, product.intendedLearner),
    includedModules: modules,
    missingModules: modules.filter((module) => !module.covered).map((module) => module.name),
    practiceScope: translated(t, `${base}.practiceScope`, product.practiceScope),
    terminologySupport: translated(t, `${base}.terminologySupport`, product.terminologySupport),
    aiAllowance: translated(t, `${base}.aiAllowance`, product.aiAllowance),
    mockAllowance: translated(t, `${base}.mockAllowance`, product.mockAllowance),
    renewalBehavior: translated(t, `${base}.renewalBehavior`, product.renewalBehavior),
    trialBenefits: product.trialBenefits.map((benefit, index) =>
      translated(t, `${base}.trialBenefits.${index + 1}`, benefit),
    ),
    trialLimits: product.trialLimits.map((limit, index) =>
      translated(t, `${base}.trialLimits.${index + 1}`, limit),
    ),
  };
}

export function localizeWeeklyReport(report: WeeklyReport, t: TFunction): WeeklyReport {
  const base = `prototypeData.reports.${report.id}`;
  return {
    ...report,
    weekLabel: translated(t, `${base}.weekLabel`, report.weekLabel),
    summary: translated(t, `${base}.summary`, report.summary),
    topicsProgressed: report.topicsProgressed.map((topic, index) =>
      translated(t, `${base}.topics.${index + 1}`, topic),
    ),
    recommendedActions: report.recommendedActions.map((action, index) =>
      translated(t, `${base}.actions.${index + 1}`, action),
    ),
  };
}

export function localizeInvitationAccess(items: string[], t: TFunction): string[] {
  return items.map((item, index) =>
    translated(t, `prototypeData.invitationAccess.${index + 1}`, item),
  );
}
