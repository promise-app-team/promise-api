import { highlight } from 'cli-highlight';
import { formatISO } from 'date-fns';
import { mapToObj } from 'remeda';
import { format, createLogger, transports, Logger } from 'winston';

import { ifs } from '@/utils';

export interface WinstonLoggerOptions {
  colorize?: boolean;
}

export function createWinstonLogger(options: WinstonLoggerOptions = {}): Logger {
  const colors = mapToObj(
    [
      'sql',
      'dim',
      'underline',
      'hidden',
      'black',
      'red',
      'green',
      'yellow',
      'blue',
      'magenta',
      'cyan',
      'white',
      'gray',
    ] as const,
    (color) => [color, color]
  );

  function colorize(color: keyof typeof colors, message: string) {
    if (!options.colorize) {
      return message;
    }

    if (color === 'sql') {
      return highlight(message, {
        language: 'sql',
        ignoreIllegals: true,
      });
    }

    return format.colorize().colorize(color, message);
  }

  return createLogger({
    transports: [
      new transports.Console({
        format: format.combine(
          format.splat(),
          {
            transform(info) {
              return {
                ...info,
                level: `${info.level.toUpperCase()}`.padStart(5),
                context: info.level ? `[${info.context}]` : '',
              };
            },
          },
          format.timestamp({
            format: () => formatISO(new Date()),
          }),
          // format.ms(),
          options.colorize ? format.colorize({ colors }) : format.uncolorize(),
          format.printf((args) => {
            const { timestamp, level, message, request, response, error, ms, context, query, ...meta } = args;

            function build(body: string, meta = '') {
              const head = `${colorize('dim', `${timestamp}`)}`;
              const label = context ? colorize('magenta', `${context} `) : '';
              const footer = ` ${colorize('dim', `${ms ? `+${ms}ms` : ''}`)}`;
              return `${head} ${level} ${label}${body ?? ''}${footer} ${meta}`;
            }

            if (isRequest(request) && isResponse(response)) {
              const method = colorize('blue', request.method);
              const path = colorize('magenta', `${request.url}`);
              const status = `${response.statusCode}`;
              const color = ifs<keyof typeof colors>([
                [status.startsWith('2'), 'green'],
                [status.startsWith('3'), 'green'],
                [status.startsWith('4'), 'yellow'],
                [status.startsWith('5'), 'red'],
              ]);
              return build(`${method} ${path} ${colorize(color ?? 'gray', status)}`);
            }

            if (error instanceof Error) {
              const errorMessage = (error.stack ?? error.message) || `${error}`;
              const stack = colorize('yellow', errorMessage);
              return message ? build(message, `\n${stack}`) : build(stack);
            } else if (typeof error === 'string') {
              const stack = colorize('yellow', error);
              return message ? build(`${message} ${stack}`) : build(stack);
            }

            if (query) {
              const sql = colorize('sql', query);
              return message ? build(message, `\n${sql}`) : build(sql);
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
}
