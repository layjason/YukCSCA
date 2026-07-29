import { describe, expect, it } from 'vitest';
import { getRouteById, isRouteActive, routeManifest } from '@/app/routes';

describe('route manifest', () => {
  it('owns every concrete route with unique ids and paths', () => {
    const ids = routeManifest.map((route) => route.id);
    const paths = routeManifest.map((route) => route.path);

    expect(routeManifest).toHaveLength(70);
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
});
