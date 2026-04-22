export type ApiSuccessResponse<TData, TMeta = Record<string, unknown>> = {
  data: TData;
  meta?: TMeta;
  message?: string;
};

export const successResponse = <TData, TMeta = Record<string, unknown>>(
  data: TData,
  options?: { message?: string; meta?: TMeta }
): ApiSuccessResponse<TData, TMeta> => ({
  data,
  ...(options?.meta ? { meta: options.meta } : {}),
  ...(options?.message ? { message: options.message } : {}),
});
