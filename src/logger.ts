import chalk from 'chalk';
import { CONFIG } from './config';

export const logger = {
  log: (...text: string[]) => {
    CONFIG.logEnabled &&
      console.log(chalk.yellow('[SquadRcon]'), chalk.green(text));
  },
  warn: (...text: string[]) => {
    CONFIG.logEnabled &&
      console.log(chalk.yellow('[SquadRcon]'), chalk.magenta(text));
  },
  error: (...text: string[]) => {
    CONFIG.logEnabled &&
      console.log(chalk.yellow('[SquadRcon]'), chalk.red(text));
  },
};
