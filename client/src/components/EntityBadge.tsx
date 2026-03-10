import { ENTITY_MAP } from '@/lib/constants';

interface Props {
  entity: string;
  size?: 'sm' | 'md';
}

export function EntityBadge({ entity, size = 'sm' }: Props) {
  const info = ENTITY_MAP[entity];
  const color = info?.color ?? '#6B7280';
  const label = size === 'sm' ? (info?.abbr ?? entity) : (info?.label ?? entity);
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-white ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
