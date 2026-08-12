type BattleLogValue = string | number | boolean | null | undefined;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error ?? 'Unknown error').slice(0, 500);
}

// Structured, token-free diagnostics for local/Vercel playtest monitoring. Never pass auth
// tokens, email addresses, IP addresses, or profile metadata into these helpers.
export function logBattleEvent(
  event: string,
  details: Record<string, BattleLogValue> = {},
): void {
  console.info(`[battle] ${JSON.stringify({ event, ...details })}`);
}

export function logBattleError(
  event: string,
  error: unknown,
  details: Record<string, BattleLogValue> = {},
): void {
  console.error(`[battle] ${JSON.stringify({ event, ...details, error: errorMessage(error) })}`);
}
