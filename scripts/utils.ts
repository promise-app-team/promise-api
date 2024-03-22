import chalk from 'chalk';

export const logger = {
  log: (...msg: string[]) => console.log(...msg),
  dim: (...msg: string[]) => console.log(chalk.dim(...msg)),
  info: (...msg: string[]) => console.log(chalk.blue.bold('>>>'), ...msg),
  warn: (...msg: string[]) => console.log(chalk.yellow.bold('>>>'), ...msg),
  error: (...msg: string[]) => console.log(chalk.red.bold('>>>'), ...msg),
  success: (...msg: string[]) => console.log(chalk.green.bold('>>>'), ...msg),
  removeLine: () => process.stdout.write('\x1b[1A\x1b[2K'),
};

export function link(text: string, url: string) {
  return `\u001B]8;;${url}\u001B\\${text}\u001B]8;;\u001B\\`;
}
