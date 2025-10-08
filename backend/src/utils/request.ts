import { Request } from 'express';

/**
 * Safely extracts a required string parameter from request params
 * Throws an error if the parameter is undefined
 */
export function getRequiredParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  if (!value) {
    throw new Error(`Missing required parameter: ${paramName}`);
  }
  return value;
}

/**
 * Safely extracts an optional string query parameter
 */
export function getOptionalQuery(req: Request, queryName: string): string | undefined {
  const value = req.query[queryName];
  return value ? String(value) : undefined;
}

/**
 * Safely extracts a required string query parameter
 * Throws an error if the query is undefined
 */
export function getRequiredQuery(req: Request, queryName: string): string {
  const value = req.query[queryName];
  if (!value) {
    throw new Error(`Missing required query parameter: ${queryName}`);
  }
  return String(value);
}

/**
 * Parses a query parameter as integer
 */
export function getIntQuery(req: Request, queryName: string, defaultValue?: number): number | undefined {
  const value = req.query[queryName];
  if (!value) return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parses a query parameter as boolean
 */
export function getBooleanQuery(req: Request, queryName: string, defaultValue = false): boolean {
  const value = req.query[queryName];
  if (!value) return defaultValue;
  const strValue = String(value).toLowerCase();
  return strValue === 'true' || strValue === '1' || strValue === 'yes';
}
