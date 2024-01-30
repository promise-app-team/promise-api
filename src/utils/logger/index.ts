import winston from 'winston';
import NestLogger from './nest-logger';
import TypeOrmLogger from './typeorm-logger';
import { formatISO } from 'date-fns';
import { LoggerOptions } from 'typeorm';

const NO_COLOR = !!process.env.NO_COLOR;
const colorize = NO_COLOR
  ? (_level: string, message: string) => message
  : winston.format.colorize().colorize;

const colors = {
  dim: 'dim',
  underline: 'underline',
  hidden: 'hidden',
  black: 'black',
  red: 'red',
  green: 'green',
  yellow: 'yellow',
  blue: 'blue',
  magenta: 'magenta',
  cyan: 'cyan',
  white: 'white',
  gray: 'gray',
} as const;

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        {
          transform(info) {
            return {
              ...info,
              level: `${info.level.toUpperCase()}`.padStart(5),
              label: info.level ? `[${info.label}]` : '',
            };
          },
        },
        winston.format.timestamp({
          format: formatISO(new Date()),
        }),
        // winston.format.ms(),
        NO_COLOR
          ? winston.format.uncolorize()
          : winston.format.colorize({ colors }),
        winston.format.printf((args) => {
          const {
            timestamp,
            level,
            message,
            request,
            response,
            error,
            ms,
            label,
            ...meta
          } = args;

          function build(body: string, meta = '') {
            const header = `${colorize(colors.dim, `${timestamp}`)}`;
            const name = label ? colorize(colors.magenta, `${label} `) : '';
            const footer = `${colorize(colors.dim, `${ms ? `+${ms}ms` : ''}`)}`;
            return `${header} ${level} ${name}${body} ${footer} ${meta}`;
          }

          if (isRequest(request) && isResponse(response)) {
            const method = colorize(colors.blue, request.method);
            const path = colorize(colors.magenta, `${request.url}`);
            const status = `${response.statusCode}`;
            const color =
              status.startsWith('2') || status.startsWith('3')
                ? colors.green
                : status.startsWith('4')
                  ? colors.yellow
                  : status.startsWith('5')
                    ? colors.red
                    : colors.gray;
            return build(`${method} ${path} ${colorize(color, status)}`);
          }

          if (error instanceof Error) {
            const errorMessage = (error.stack ?? error.message) || `${error}`;
            const stack = colorize(colors.yellow, errorMessage);
            return build(message, `\n${stack}`);
          } else if (typeof error === 'string') {
            const stack = colorize(colors.yellow, error);
            return build(message, `\n${stack}`);
          }

          const metaString = JSON.stringify(meta, null, 2);
          const metaStringified = metaString === '{}' ? '' : `\n${metaString}`;
          return build(message, metaStringified);
        })
      ),
    }),
  ],
});

function isRequest(request: any): boolean {
  return request && request.method && request.url;
}

function isResponse(response: any): boolean {
  return response && response.statusCode;
}

export default {
  nest: () => new NestLogger(logger),
  typeorm: (options?: LoggerOptions) => new TypeOrmLogger(logger, options),
};
