import type { AxiosError } from "axios";

/**
 * Every non-2xx response from abyssoftime-cms-api is Nest's default
 * HttpException shape: { statusCode, message, error }. `message` is a
 * string for most handler-thrown errors, but a string array for
 * ValidationPipe failures — never `error`, which is just the HTTP status
 * text (e.g. "Bad Request"), not a useful message on its own.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as AxiosError<{ message?: string | string[] }>).response?.data;
  if (!data?.message) return fallback;
  return Array.isArray(data.message) ? data.message.join(", ") : data.message;
}
