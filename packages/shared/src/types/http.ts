export type TApiResponse<T = unknown> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
      code?: string
    }
