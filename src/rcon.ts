import EventEmitter from 'events';
import net from 'net';
import { chatParser, commandParser } from './parsers';
import { helpers } from './parsers/helpers';
import {
  ERconResponseType,
  TOptions,
  TRconResponse,
  TResponseTaskQueue,
} from './types';
import { decode, encode } from './utils';

const EMPTY_PACKET_ID = 100;
const AUTH_PACKET_ID = 101;
const PING_PACKET_ID = 102;

export const Rcon = (options: TOptions) => {
  const { host, port, password, pingDelay } = options;
  const rconEmitter = new EventEmitter();
  const client: net.Socket = net.createConnection({
    host,
    port,
    noDelay: true,
  });

  const responseTaskQueue: TResponseTaskQueue[] = [];
  const lastCommands: string[] = [];

  let commandId = 0;
  let lastDataBuffer = Buffer.alloc(0);
  let connected = false;
  let timerPing: NodeJS.Timeout;

  const onAuth = () => {
    client.write(
      encode(
        ERconResponseType.SERVERDATA_AUTH,
        AUTH_PACKET_ID,
        password,
      ),
    );
  };

  const onConnected = () => {
    connected = true;

    rconEmitter.emit('connected');
    timerPing = setInterval(
      () => {
        ping();
      },
      pingDelay || 60000 * 2,
    );
  };

  const onData = (data: Buffer) => {
    const decodedData = decode(data);

    switch (decodedData.type) {
      case ERconResponseType.SERVERDATA_COMMAND:
        {
          if (decodedData.id === AUTH_PACKET_ID) {
            onConnected();
          } else if (decodedData.id === -1) {
            throw Error('No Auth');
          }
        }
        break;

      case ERconResponseType.SERVERDATA_SERVER:
        {
          chatParser(rconEmitter, decodedData);
          rconEmitter.emit('data', decodedData);
        }
        break;
      default:
        {
          if (decodedData.id === PING_PACKET_ID) return;

          if (decodedData.id === EMPTY_PACKET_ID) {
            if (lastDataBuffer.byteLength >= 1) {
              const lastDataDecoded = decode(lastDataBuffer);

              commandParser(
                rconEmitter,
                lastDataDecoded,
                lastCommands[0],
              );

              lastCommands.shift();

              responseTaskQueue.shift()?.(lastDataDecoded);
              lastDataBuffer = Buffer.alloc(0);
            }
          } else {
            lastDataBuffer = Buffer.concat(
              [lastDataBuffer, data],
              lastDataBuffer.byteLength + data.byteLength,
            );
          }
        }
        break;
    }
  };

  const execute = (command: string): Promise<TRconResponse> => {
    return new Promise((resolve, reject) => {
      lastCommands.push(command);
      responseTaskQueue.push((response) => {
        if (!connected) {
          reject();
        }

        resolve(response);
      });

      commandId = commandId >= 80 ? 1 : commandId + 1;

      client.write(
        encode(
          ERconResponseType.SERVERDATA_COMMAND,
          commandId,
          command,
        ),
      );

      client.write(
        encode(
          ERconResponseType.SERVERDATA_COMMAND,
          EMPTY_PACKET_ID,
          '',
        ),
      );
    });
  };

  const ping = () => {
    client.write(
      encode(
        ERconResponseType.SERVERDATA_COMMAND,
        PING_PACKET_ID,
        '',
      ),
    );
  };

  const getListPlayers = async () => {
    const response = await execute('ListPlayers');

    return helpers.getListPlayers(rconEmitter, response);
  };

  const getListSquads = async () => {
    const response = await execute('ListSquads');

    return helpers.getListSquads(rconEmitter, response);
  };

  client.on('data', onData);
  client.once('ready', onAuth);
  client.once('close', () => {
    connected = false;
    clearInterval(timerPing);

    rconEmitter.emit('close');
  });
  client.once('end', () => {
    connected = false;
    clearInterval(timerPing);

    rconEmitter.emit('end');
  });
  client.once('error', (error) => {
    connected = false;
    clearInterval(timerPing);

    rconEmitter.emit('error', error);
  });

  return {
    rconEmitter,
    execute,
    getListPlayers,
    getListSquads,
  };
};
