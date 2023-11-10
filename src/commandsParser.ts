import EventEmitter from 'events';
import { getListPlayers } from './helpers';
import { RconResponse } from './types';

export const commandsParser = (
  rconEmitter: EventEmitter,
  data: RconResponse,
) => {
  const { body } = data;

  if (body.includes('Active Players')) {
    getListPlayers(rconEmitter, data);
  }
};
