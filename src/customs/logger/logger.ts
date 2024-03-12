import { formatISO } from 'date-fns';
import { format, createLogger, transports } from 'winston';

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

const NO_COLOR = !!process.env.NO_COLOR;
function colorize(color: keyof typeof colors, message: string) {
  if (NO_COLOR) {
    return message;
  }

  return format.colorize().colorize(color, message);
}

export const logger = createLogger({
  transports: [
    new transports.Console({
      format: format.combine(
        {
          transform(info) {
            return {
              ...info,
              level: `${info.level.toUpperCase()}`.padStart(5),
              label: info.level ? `[${info.label}]` : '',
            };
          },
        },
        format.timestamp({
          format: () => formatISO(new Date()),
        }),
        // format.ms(),
        NO_COLOR ? format.uncolorize() : format.colorize({ colors }),
        format.printf((args) => {
          const { timestamp, level, message, request, response, error, ms, label, ...meta } = args;

          function build(body: string, meta = '') {
            const header = `${colorize('dim', `${timestamp}`)}`;
            const name = label ? colorize('magenta', `${label} `) : '';
            const footer = `${colorize('dim', `${ms ? `+${ms}ms` : ''}`)}`;
            return `${header} ${level} ${name}${body} ${footer} ${meta}`;
          }

          if (isRequest(request) && isResponse(response)) {
            const method = colorize('blue', request.method);
            const path = colorize('magenta', `${request.url}`);
            const status = `${response.statusCode}`;
            const color =
              status.startsWith('2') || status.startsWith('3')
                ? 'green'
                : status.startsWith('4')
                  ? 'yellow'
                  : status.startsWith('5')
                    ? 'red'
                    : 'gray';
            return build(`${method} ${path} ${colorize(color, status)}`);
          }

          if (error instanceof Error) {
            const errorMessage = (error.stack ?? error.message) || `${error}`;
            const stack = colorize('yellow', errorMessage);
            return build(message, `\n${stack}`);
          } else if (typeof error === 'string') {
            const stack = colorize('yellow', error);
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
