import { Rcon } from './rcon';
import { TOptions } from './types';

export const RconPromise = (
  options: TOptions,
): Promise<ReturnType<typeof Rcon>> => {
  return new Promise((resolve) => {
    const { rconEmitter, ...rest } = Rcon(options);

    rconEmitter.once('connected', () =>
      resolve({ rconEmitter, ...rest }),
    );
  });
};
