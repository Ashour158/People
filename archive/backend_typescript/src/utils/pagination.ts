import { PaginationParams, PaginationMeta } from '../types';

export const getPagination = (params: PaginationParams) => {
  const page = Math.max(1, params.page || 1);
  const perPage = Math.min(100, Math.max(1, params.perPage || 10));
  const offset = (page - 1) * perPage;

  return { page, perPage, offset };
};

export const getPaginationMeta = (
  total: number,
  page: number,
  perPage: number
): PaginationMeta => {
  return {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage)
  };
};
