export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  public constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}
