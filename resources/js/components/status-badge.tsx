import { Badge } from '@/components/ui/badge';
import { humanize } from '@/lib/format';

const destructive = new Set([
    'overdue',
    'blocked',
    'missing',
    'changes_requested',
    'high',
]);
const primary = new Set(['approved', 'published', 'paid', 'done', 'active']);
const secondary = new Set([
    'editing',
    'in_progress',
    'scripted',
    'scheduled',
    'shot',
]);

export function StatusBadge({ value }: { value: string }) {
    const variant = destructive.has(value)
        ? 'destructive'
        : primary.has(value)
          ? 'default'
          : secondary.has(value)
            ? 'secondary'
            : 'outline';

    return <Badge variant={variant}>{humanize(value)}</Badge>;
}
