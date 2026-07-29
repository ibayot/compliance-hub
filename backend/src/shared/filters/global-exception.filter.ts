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
      this.logger.warn(`Database query failed on ${request.method} ${request.url}`);
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid input provided.',
        error: 'Bad Request',
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
    this.logger.error(
      `Unhandled Exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
