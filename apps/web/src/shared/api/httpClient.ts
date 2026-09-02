export interface ApiProblem {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  violations?: Array<{ field?: string; path?: string; code: string }>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly violations: Array<{ field: string; code: string }>;
  readonly retryAfterSeconds: number | undefined;

  constructor(status: number, problem: ApiProblem, retryAfterSeconds?: number) {
    super(problem.detail ?? problem.title ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = problem.code;
    this.violations = (problem.violations ?? []).map((row) => ({
      field: row.field ?? row.path ?? '',
      code: row.code,
    }));
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T | ApiProblem;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body as ApiProblem,
      parseRetryAfterSeconds(response.headers.get('Retry-After')),
    );
  }
  return body as T;
}

function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isInteger(seconds) && seconds >= 0) {
    return seconds;
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) {
    return undefined;
  }
  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}
