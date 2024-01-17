import EventEmitter from 'events';
import { helpers } from './helpers';

export const commandParser = (
  rconEmitter: EventEmitter,
  data: string,
  command: string,
) => {
  switch (command) {
    case 'ListPlayers':
      helpers.getListPlayers(rconEmitter, data);
      break;
    case 'ListSquads':
      helpers.getListSquads(rconEmitter, data);
      break;
    case 'ShowCurrentMap':
      helpers.getCurrentMap(rconEmitter, data);
    case 'ShowNextMap':
      helpers.getNextMap(rconEmitter, data);
    case 'ShowServerInfo':
      helpers.getServerInfo(rconEmitter, data);
    default:
      break;
  }
};
