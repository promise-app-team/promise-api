import { formatISO } from 'date-fns';
import { highlight } from 'sql-highlight';
import { format, createLogger, transports } from 'winston';

import { ifs, memoize } from '@/utils';

import { createColorMap } from './color';

import type { Logger } from 'winston';

export interface WinstonLoggerOptions {
  colorize?: boolean;
}

const colors = createColorMap(['sql'] as const);

export const createWinstonLogger = memoize((options: WinstonLoggerOptions = {}): Logger => {
  function colorize(color: keyof typeof colors, message: string) {
    if (!options.colorize) {
      return message;
    }

    if (color === 'sql') {
      const blue = '\x1b[34m';
      const magenta = '\x1b[35m';
      const yellow = '\x1b[33m';
      const green = '\x1b[32m';
      const defaultColor = '\x1b[0m';
      return highlight(message, {
        colors: {
          keyword: blue,
          function: magenta,
          number: green,
          string: defaultColor,
          special: yellow,
          bracket: green,
          comment: '\x1b[2m\x1b[90m',
          clear: '\x1b[0m',
        },
      });
    }

    return format.colorize({ colors }).colorize(color, message);
  }

  function colorizeByLevel(level: string, message: string) {
    return colorize(
      ifs<keyof typeof colors>([
        [level.includes('LOG'), 'green'],
        [level.includes('WARN'), 'yellow'],
        [level.includes('ERROR'), 'red'],
        [level.includes('DEBUG'), 'blue'],
        [level.includes('FATAL'), 'magenta'],
        [level.includes('VERBOSE'), 'cyan'],
      ]) ?? 'black',
      message
    );
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
                level: info.level.toUpperCase().padStart(7),
                context: info.level ? `[${info.context}]` : '',
              };
            },
          },
          format.timestamp({
            format: () => formatISO(new Date()),
          }),
          // format.ms(),
          format.printf((args) => {
            const { timestamp, level, request, response, error, ms, context, query, message, ...meta } = args;
            const msg = [null, undefined, 'null', 'undefined'].includes(message) ? '' : message;

            function build(message: string, meta = '') {
              const head = `${colorize('dim', `[${timestamp}]`)}`;
              const label = context ? colorize('bold cyan', `${context} `) : '';
              const footer = ` ${colorize('dim', `${ms ? `+${ms}ms` : ''}`)}`;
              const lvl = colorizeByLevel(level, level);
              const body = colorizeByLevel(level, message);

              return `${head} ${lvl} ${label}${body ?? ''}${footer} ${meta}`;
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
              return msg ? build(msg, `\n${stack}`) : build(stack);
            } else if (typeof error === 'string') {
              const stack = colorize('yellow', error);
              return msg ? build(`${msg} ${stack}`) : build(stack);
            }

            if (query) {
              const sql = colorize('sql', query);
              return msg ? build(msg, `\n${sql}`) : build(sql);
            }

            const metaString = JSON.stringify(meta, null, 2);
            const metaStringified = metaString === '{}' ? '' : `\n${metaString}`;
            return build(msg, metaStringified);
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
});
