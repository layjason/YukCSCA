/** Must match `AgentProviderUnavailableException` HTTP `detail` strings. */
export const ASK_PROVIDER_TIMEOUT_DETAIL = 'The Ask provider timed out.';
export const ASK_PROVIDER_FORMAT_DETAIL = 'The Ask answer could not be read. Try again.';

export type ProviderUnavailableCopyKey =
  'agent.errorTimeout' | 'agent.errorAnswerFormat' | 'agent.errorProvider';

export function providerUnavailableCopyKey(detail: string | undefined): ProviderUnavailableCopyKey {
  if (detail === ASK_PROVIDER_TIMEOUT_DETAIL) return 'agent.errorTimeout';
  if (detail === ASK_PROVIDER_FORMAT_DETAIL) return 'agent.errorAnswerFormat';
  return 'agent.errorProvider';
}
