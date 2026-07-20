export interface ApiProblem {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, problem: ApiProblem) {
    super(problem.detail ?? problem.title ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = problem.code;
  }
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T | ApiProblem;
  if (!response.ok) {
    throw new ApiError(response.status, body as ApiProblem);
  }
  return body as T;
}
