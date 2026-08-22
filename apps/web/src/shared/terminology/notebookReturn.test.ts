import { expect, test } from 'vitest';
import {
  isSafeAppPath,
  notebookBackLabelKey,
  notebookReturnTo,
  notebookStateFrom,
} from './notebookReturn';

test('records a practice or lesson origin and ignores notebook-internal hops', () => {
  const fromPractice = notebookStateFrom('/app/practice/sessions/abc?item=1');
  expect(fromPractice).toEqual({ notebookReturnTo: '/app/practice/sessions/abc?item=1' });
  expect(notebookReturnTo(fromPractice)).toBe('/app/practice/sessions/abc?item=1');

  const fromLesson = notebookStateFrom('/app/learn/MATHEMATICS/lessons/lesson-1');
  expect(notebookReturnTo(fromLesson)).toBe('/app/learn/MATHEMATICS/lessons/lesson-1');

  expect(notebookStateFrom('/app/learn/terms')).toBeUndefined();
  expect(notebookStateFrom('/app/learn/terms/term-1', fromPractice)).toEqual(fromPractice);
});

test('rejects off-app return paths', () => {
  expect(isSafeAppPath('https://evil.example/app/learn')).toBe(false);
  expect(isSafeAppPath('//evil.example')).toBe(false);
  expect(notebookReturnTo({ notebookReturnTo: 'https://evil.example' }, '/app/learn')).toBe(
    '/app/learn',
  );
});

test('picks a back label for practice and lesson origins', () => {
  expect(notebookBackLabelKey('/app/practice/sessions/abc')).toBe('assessment.backToPractice');
  expect(notebookBackLabelKey('/app/learn/MATHEMATICS/lessons/l1')).toBe('assessment.backToLesson');
  expect(notebookBackLabelKey('/app/learn')).toBe('learn.backToLearn');
});
