import "server-only";
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function safeError(error: unknown) {
  if (error instanceof AppError) return error;
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    String(error.code).startsWith("ERR_SQLITE")
  )
    return new AppError(
      "STORAGE_UNAVAILABLE",
      "Learning history could not be saved or opened. Ask a parent to check the data volume and free disk space.",
      503,
    );
  if (
    error instanceof Error &&
    ["TimeoutError", "AbortError"].includes(error.name)
  )
    return new AppError(
      "REQUEST_TIMEOUT",
      "That took too long. Please try again.",
      504,
    );
  return new AppError(
    "PROVIDER_UNAVAILABLE",
    "The AI service is temporarily unavailable. Please try again.",
    502,
  );
}
