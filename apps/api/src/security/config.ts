export function positiveIntegerEnv(
  name: string,
  fallback: number,
): number {
  const raw = process.env[name];

  if (!raw) return fallback;

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${name} must be a positive integer. Received "${raw}".`,
    );
  }

  return parsed;
}
