import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, PipeTransform } from "@nestjs/common";
import type { ApiError, ErrorCode } from "@triptogether/shared";
import type { Response } from "express";
import type { ZodType } from "zod";

export class AppException extends HttpException {
  constructor(code: ErrorCode, status: HttpStatus, details?: unknown) {
    const body: ApiError = { code, details };
    super(body, status);
  }
}

export const unauthenticated = () => new AppException("UNAUTHENTICATED", HttpStatus.UNAUTHORIZED);
export const forbidden = () => new AppException("FORBIDDEN", HttpStatus.FORBIDDEN);
export const notFound = (code: ErrorCode) => new AppException(code, HttpStatus.NOT_FOUND);

export class ZodPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new AppException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST, parsed.error.issues);
    }
    return parsed.data;
  }
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const isApiError = typeof body === "object" && body !== null && "code" in body;
      res.status(exception.getStatus()).json(isApiError ? body : { code: "FORBIDDEN" satisfies ErrorCode });
      return;
    }
    console.error(exception);
    res.status(500).json({ code: "INTERNAL" });
  }
}
