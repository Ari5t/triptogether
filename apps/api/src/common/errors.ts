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

/** For framework errors (unknown route, broken JSON) that carry no code of ours. */
export function codeForStatus(status: number): ErrorCode {
  if (status === 400) return "VALIDATION_FAILED";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  return "INTERNAL";
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const isApiError = typeof body === "object" && body !== null && "code" in body;
      const status = exception.getStatus();
      res.status(status).json(isApiError ? body : { code: codeForStatus(status) });
      return;
    }
    console.error(exception);
    res.status(500).json({ code: "INTERNAL" });
  }
}
