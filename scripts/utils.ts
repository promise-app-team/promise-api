import { exec } from 'node:child_process';
import readline from 'node:readline';

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

export async function prompt(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = `${chalk.bold.blue('???')} ${chalk.bold.gray(message)} `;
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close();
      res(answer.trim());
    });
  });
}

export function link(text: string, url: string) {
  return `\u001B]8;;${url}\u001B\\${text}\u001B]8;;\u001B\\`;
}

interface ExecuteOptions {
  whitelists?: (string | RegExp)[];
  echo?: boolean;
}

export async function execute(command: string, options: ExecuteOptions = {}) {
  if (options.echo) {
    const cmd = command.replace(/([\r\n]|\s{2,})+/g, ' ').trim();
    logger.dim(`[echo] $ ${cmd}`);
  }

  const whitelists = (options.whitelists || []).map((w) => (w instanceof RegExp ? w : new RegExp(w)));
  return new Promise<string>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error && !whitelists.some((regex) => regex.test(stderr))) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
