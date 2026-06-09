import { Logger } from '@nestjs/common';
import { requestContextStorage } from '../context/request-context';

/**
 * ContextLogger
 *
 * Thin wrapper around NestJS Logger that automatically prefixes every message
 * with the current request ID pulled from AsyncLocalStorage.
 * Usage: `private readonly logger = new ContextLogger(MyClass.name);`
 */
export class ContextLogger extends Logger {
  private prefix(): string {
    const ctx = requestContextStorage.getStore();
    return ctx ? `[reqId:${ctx.requestId}] ` : '';
  }

  override log(message: any, context?: string): void {
    super.log(`${this.prefix()}${message}`, context);
  }

  override warn(message: any, context?: string): void {
    super.warn(`${this.prefix()}${message}`, context);
  }

  override error(message: any, stack?: string, context?: string): void {
    super.error(`${this.prefix()}${message}`, stack, context);
  }

  override debug(message: any, context?: string): void {
    super.debug(`${this.prefix()}${message}`, context);
  }

  override verbose(message: any, context?: string): void {
    super.verbose(`${this.prefix()}${message}`, context);
  }
}
