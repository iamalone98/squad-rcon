import { Rcon } from './rcon';
import { TOptions } from './types';

export const RconPromise = (
  options: TOptions,
): Promise<ReturnType<typeof Rcon>> => {
  return new Promise((resolve, reject) => {
    const { rconEmitter, ...rest } = Rcon(options);

    rconEmitter.once('connected', () =>
      resolve({ rconEmitter, ...rest }),
    );

    rconEmitter.once('close', () => reject());
    rconEmitter.once('end', () => reject());
    rconEmitter.once('error', (error) => reject(error));
  });
};
