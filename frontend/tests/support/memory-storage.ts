// CheckpointSync uses one storage entry for all saves that still need confirmation.
export function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, saved: string) => { value = saved; },
  };
}
