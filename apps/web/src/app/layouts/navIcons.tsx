import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  Circle,
  ClipboardList,
  House,
  LogOut,
  Menu,
  Package,
  PanelLeft,
  PanelLeftClose,
  ShoppingBag,
  Target,
  Timer,
  User,
  Users,
} from 'lucide-react';

const NAV_ICONS: Record<string, LucideIcon> = {
  today: CalendarDays,
  learn: BookOpen,
  practice: Target,
  'mock-exams': Timer,
  progress: ChartColumn,
  profile: User,
  more: Menu,
  'parent-home': House,
  'parent-family': Users,
  'parent-reports': ClipboardList,
  'parent-purchases': ShoppingBag,
  'parent-account': User,
  'admin-packages': Package,
};

export function ShellNavIcon({ id, size = 18 }: { id: string; size?: number }): React.JSX.Element {
  const Icon = NAV_ICONS[id] ?? Circle;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}

export function NavCollapseIcon({
  expanded,
  size = 18,
}: {
  expanded: boolean;
  size?: number;
}): React.JSX.Element {
  const Icon = expanded ? PanelLeftClose : PanelLeft;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}

export function SignOutIcon({ size = 18 }: { size?: number }): React.JSX.Element {
  return <LogOut size={size} strokeWidth={2} aria-hidden="true" />;
}
