import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import i18n from '../shared/i18n';

beforeEach(async () => {
  window.localStorage.clear();
  await i18n.changeLanguage('id');
});
