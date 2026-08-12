export const SECRET_FIELDS = [
  'telegramBotToken',
  'locketBotToken',
  'geminiApiKey',
  'groqApiKey',
  'expenseAppsScriptUrl',
] as const;

const MASK_PREFIX = '••••';

export function maskSecret(value: string | undefined | null): string {
  if (!value) return '';
  return MASK_PREFIX + value.slice(-4);
}

export function isSecretMasked(value: string | undefined | null): boolean {
  return !value || value.startsWith(MASK_PREFIX);
}

export function maskSecretFields(data: Record<string, any>): Record<string, any> {
  const result = { ...data };
  for (const field of SECRET_FIELDS) {
    if (field in result) {
      result[field] = maskSecret(result[field]);
    }
  }
  return result;
}