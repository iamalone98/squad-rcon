import chalk from 'chalk';

export const initLogger = (id: number, enabled: boolean) => ({
  log: (...text: string[]) => {
    enabled &&
      console.log(
        chalk.yellow(`[SquadRcon][${id}]`),
        chalk.green(text),
      );
  },

  warn: (...text: string[]) => {
    enabled &&
      console.log(
        chalk.yellow(`[SquadRcon][${id}]`),
        chalk.magenta(text),
      );
  },

  error: (...text: string[]) => {
    enabled &&
      console.log(
        chalk.yellow(`[SquadRcon][${id}]`),
        chalk.red(text),
      );
  },
});
