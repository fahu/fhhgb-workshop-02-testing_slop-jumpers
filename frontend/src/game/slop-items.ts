import catalogue from '../../../shared/slop-items.json' with { type: 'json' };

export interface SlopItem {
  id: string;
  name: string;
  tag: string;
  shape: string;
  color: string;
  detail: string;
}

export const slopItems: readonly SlopItem[] = catalogue;
const itemsById = new Map(slopItems.map(item => [item.id, item]));

export function slopItem(id?: string | null): SlopItem | undefined {
  return id ? itemsById.get(id) : undefined;
}
