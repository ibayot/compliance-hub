import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If it's already an HTTP Exception (thrown intentionally by the app), return it as is.
    // This ensures existing functionality is NOT affected.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      return response.status(status).json(res);
    }

    // Handle TypeORM QueryFailedError (often triggered by ZAP injecting invalid characters)
    // Map this to a 400 Bad Request instead of a 500 Internal Server Error.
    if (exception instanceof QueryFailedError) {
      const driverError = (exception as any).driverError || {};
      const code = String(driverError.code || '');
      const errno = Number(driverError.errno || 0) || null;
      const databaseMessage = String(driverError.sqlMessage || driverError.message || '');
      const rejectedColumn = databaseMessage.match(/column\s+'([^']+)'/i)?.[1] || null;
      const diagnostic = [
        code || 'unknown',
        errno ? `errno=${errno}` : null,
        rejectedColumn ? `column=${rejectedColumn}` : null,
        `${request.method} ${request.path}`,
      ]
        .filter(Boolean)
        .join(', ');
      const clientInputCodes = new Set([
        'ER_DATA_TOO_LONG',
        'ER_TRUNCATED_WRONG_VALUE',
        'ER_BAD_NULL_ERROR',
        'ER_WARN_DATA_OUT_OF_RANGE',
      ]);
      if (clientInputCodes.has(code)) {
        // Record only structural diagnostics. Never log the SQL statement or rejected value,
        // because feedback and other requests may contain personal information.
        this.logger.warn(`Invalid database input (${diagnostic})`);
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid input provided.',
          error: 'Bad Request',
        });
      }
      this.logger.error(`Database failure (${diagnostic})`);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'A database error occurred. Please contact support.',
        error: 'Internal Server Error',
      });
    }

    // Handle TypeORM EntityNotFoundError
    if (exception instanceof EntityNotFoundError) {
      return response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'The requested resource was not found.',
        error: 'Not Found',
      });
    }

    // Unhandled unexpected exceptions
    this.logger.error(`Unhandled request exception (${request.method})`);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
