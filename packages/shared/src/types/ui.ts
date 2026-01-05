export type TPaginationParams = {
  page: number
  limit: number
}

export type TPaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
