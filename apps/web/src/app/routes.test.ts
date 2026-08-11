import { describe, expect, it } from 'vitest';
import { getRouteById, isRouteActive, routeManifest } from '@/app/routes';

describe('route manifest', () => {
  it('owns every concrete route with unique ids and paths', () => {
    const ids = routeManifest.map((route) => route.id);
    const paths = routeManifest.map((route) => route.path);

    expect(routeManifest).toHaveLength(74);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('assigns every route to an enforced access group', () => {
    expect(routeManifest.every((route) => route.access.length > 0)).toBe(true);
  });

  it('keeps nested parent routes attached to their owning navigation item', () => {
    expect(isRouteActive(getRouteById('parent-family'), '/parent/invitations/inv-1')).toBe(true);
    expect(isRouteActive(getRouteById('parent-reports'), '/parent/students/stu-1/report')).toBe(
      true,
    );
    expect(isRouteActive(getRouteById('parent-purchases'), '/parent/orders/order-1')).toBe(true);
    expect(isRouteActive(getRouteById('home'), '/products')).toBe(false);
  });

  it('promotes production Learn routes off preview workspace gate', () => {
    const learn = getRouteById('learn');
    const subject = getRouteById('learn-subject');
    const lesson = getRouteById('learn-lesson');

    expect(learn.availability).toBe('implemented');
    expect(learn.access).toBe('student-settings');
    expect(learn.prototypeOnly).toBeUndefined();
    expect(isRouteActive(learn, '/app/learn/MATHEMATICS')).toBe(true);
    expect(isRouteActive(learn, '/app/learn/MATHEMATICS/lessons/abc')).toBe(true);

    expect(subject.path).toBe('/app/learn/:subject');
    expect(subject.access).toBe('student-settings');
    expect(subject.availability).toBe('implemented');

    expect(lesson.path).toBe('/app/learn/:subject/lessons/:resourceId');
    expect(lesson.access).toBe('student-settings');
    expect(lesson.availability).toBe('implemented');
  });

  it('promotes production Practice and assessment routes off preview workspace gate', () => {
    const practice = getRouteById('practice');
    const session = getRouteById('practice-session');
    const mistakes = getRouteById('practice-mistakes');
    const checkpoint = getRouteById('learn-checkpoint');
    const remediation = getRouteById('learn-remediation');

    for (const route of [practice, session, mistakes, checkpoint, remediation]) {
      expect(route.availability).toBe('implemented');
      expect(route.access).toBe('student-settings');
      expect(route.prototypeOnly).toBeUndefined();
    }

    expect(session.path).toBe('/app/practice/sessions/:sessionId');
    expect(checkpoint.path).toBe('/app/learn/:subject/lessons/:resourceId/checkpoint');
    expect(remediation.path).toBe('/app/learn/:subject/remediation/:resourceId');
    expect(isRouteActive(practice, '/app/practice/mistakes')).toBe(true);
  });
});
