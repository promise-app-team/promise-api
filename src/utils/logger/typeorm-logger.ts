import {
  AbstractLogger,
  LogLevel,
  LogMessage,
  LoggerOptions,
  QueryRunner,
} from 'typeorm';
import winston from 'winston';

const IS_COLOR = !process.env.NO_COLOR;

export default class TypeOrmLogger extends AbstractLogger {
  constructor(
    private readonly logger: winston.Logger,
    options?: LoggerOptions
  ) {
    super(options);
  }

  protected writeLog(
    level: LogLevel,
    message: string | number | LogMessage | (string | number | LogMessage)[],
    _runner?: QueryRunner
  ): void {
    const messages = this.prepareLogMessages(message, {
      highlightSql: IS_COLOR,
    });

    for (const message of messages) {
      const defaultMeta = {
        label: `TypeORM.${message.type}`,
      };

      switch (message.type ?? level) {
        case 'log':
        case 'info':
        case 'schema':
        case 'schema-build':
        case 'migration':
          this.logger.info(`${message.message}`, {
            ...defaultMeta,
          });
          break;

        case 'query':
          this.logger.info(`${message.message}`, {
            ...defaultMeta,
          });
          break;

        case 'warn':
        case 'query-slow':
          this.logger.warn(`${message.message}`, {
            ...defaultMeta,
          });
          break;

        case 'error':
        case 'query-error':
          this.logger.error(`${message.message}`, {
            ...defaultMeta,
          });
          break;
      }
    }
  }
}
