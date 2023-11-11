import EventEmitter from 'events';
import { TRconResponse } from '../types';
import { helpers } from './helpers';

export const commandParser = (
  rconEmitter: EventEmitter,
  data: TRconResponse,
  command: string,
) => {
  switch (command) {
    case 'ListPlayers':
      helpers.getListPlayers(rconEmitter, data);
      break;
    case 'ListSquads':
      helpers.getListSquads(rconEmitter, data);
      break;
    default:
      break;
  }
};