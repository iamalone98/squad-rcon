import chalk from 'chalk';
import { CONFIG } from './config';
import { ELoggerType } from './types';

export const logger = (text: string, type?: ELoggerType) => {
  if (CONFIG.logEnabled) {
    switch (type) {
      case ELoggerType.SUCCESS:
        console.log(chalk.yellow('[SquadRcon]'), chalk.green(text));
        break;
      case ELoggerType.WARN:
        console.log(chalk.yellow('[SquadRcon]'), chalk.magenta(text));
        break;
      case ELoggerType.ERROR:
        console.log(chalk.yellow('[SquadRcon]'), chalk.red(text));
        break;
      default:
        console.log(chalk.yellow('[SquadRcon]'), chalk.magenta(text));
        break;
    }
  }
};
