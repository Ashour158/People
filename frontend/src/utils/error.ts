import type { AxiosError } from 'axios';
import type { ApiResponse } from '../types';

/**
 * Extract error message from API error response
 */
export const getErrorMessage = (error: unknown): string => {
  if (!error) return 'An unknown error occurred';

  // Handle AxiosError
  if (isAxiosError(error)) {
    const response = error.response?.data as ApiResponse<unknown> | undefined;
    if (response?.error) return response.error;
    if (response?.message) return response.message;
    if (error.message) return error.message;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
};

/**
 * Type guard for AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Format validation errors from API
 */
export const formatValidationErrors = (
  error: unknown
): Record<string, string> => {
  if (!isAxiosError(error)) return {};

  const response = error.response?.data as
    | { errors?: Record<string, string>; details?: Record<string, string> }
    | undefined;

  return response?.errors || response?.details || {};
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  return !error.response && error.message === 'Network Error';
};

/**
 * Check if error is authentication error (401)
 */
export const isAuthError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  return error.response?.status === 401;
};

/**
 * Check if error is authorization error (403)
 */
export const isForbiddenError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  return error.response?.status === 403;
};

/**
 * Check if error is not found error (404)
 */
export const isNotFoundError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  return error.response?.status === 404;
};
