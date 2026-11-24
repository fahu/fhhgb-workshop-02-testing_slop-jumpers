const HTTP_MESSAGES: Record<number, string> = {
  400: 'Please check the information you entered.',
  403: 'You don’t have access to this action.',
  404: 'The requested information couldn’t be found.',
  405: 'This action isn’t available.',
  408: 'The request took too long. Please try again.',
  409: 'This update doesn’t match your saved progress.',
  415: 'The information couldn’t be accepted in this format.',
  422: 'Some information is missing or incorrect.',
  429: 'Too many attempts. Please wait a moment.',
  500: 'Something went wrong on the server.',
  502: 'The server is currently unavailable.',
  503: 'The server is busy right now. Please try again shortly.',
  504: 'The server is taking too long to respond.',
};

export class ApiError extends Error {
  constructor(readonly status: number, readonly serverMessage?: string) {
    super(HTTP_MESSAGES[status] ?? 'We couldn’t complete that action. Please try again.');
  }
}

export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(6500),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new Error(timedOut ? HTTP_MESSAGES[504] : 'We couldn’t connect to the server. Check your connection and try again.', { cause: error });
  }
  if (!response.ok) {
    const error = await response.json().catch(() => undefined);
    throw new ApiError(response.status, typeof error?.message === 'string' ? error.message : undefined);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  try {
    return await response.json() as T;
  } catch (error) {
    throw new Error('We couldn’t read the server’s response. Please try again.', { cause: error });
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
