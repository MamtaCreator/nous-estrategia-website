// Matches NousEstrategia.Domain.Responses.ApiResponse<T> exactly (camelCase on the wire).
export interface ApiError {
  code: string;
  message: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  pagination: PaginationInfo | null;
}
