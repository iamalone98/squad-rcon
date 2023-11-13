import EventEmitter from 'events';
import net from 'net';
import { CONFIG } from './config';
import { logger } from './logger';
import { chatParser, commandParser, helpers } from './parsers/index';
import {
  ELoggerType,
  ERconResponseType,
  TOptions,
  TRconResponse,
  TResponseTaskQueue,
} from './types';
import { decode, encode } from './utils';

const EMPTY_PACKET_ID = 100;
const AUTH_PACKET_ID = 101;
const PING_PACKET_ID = 102;

export const Rcon = (options: TOptions, _isPromise?: boolean) => {
  const {
    host,
    port,
    password,
    pingDelay,
    autoReconnect = true,
    autoReconnectDelay = 10000,
    logEnabled,
  } = options;

  CONFIG.logEnabled =
    typeof logEnabled === 'undefined' ? true : logEnabled;

  const rconEmitter = new EventEmitter();
  const responseTaskQueue: TResponseTaskQueue[] = [];
  const lastCommands: string[] = [];
  const client: net.Socket = net.createConnection({
    host,
    port,
    noDelay: true,
  });

  logger('Connecting');

  let commandId = 0;
  let lastDataBuffer = Buffer.alloc(0);
  let connected = false;
  let timerPing: NodeJS.Timeout;

  const onAuth = () => {
    logger('Authorization in progress');

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

  const onCloseConnection = () => {
    rconEmitter.emit('close');
    logger('Connection close', ELoggerType.ERROR);

    reconnect();
  };

  const onErrorConnection = (error?: Error) => {
    rconEmitter.emit('err', error);
    logger('Connection error', ELoggerType.ERROR);
  };

  const reconnect = () => {
    connected = false;

    if (autoReconnect && !connected && !_isPromise) {
      setTimeout(() => {
        client.end();
        logger('Reconnecting');
        Rcon(options);
      }, autoReconnectDelay);
    }

    clearInterval(timerPing);
  };

  const onData = (data: Buffer) => {
    const decodedData = decode(data);

    switch (decodedData.type) {
      case ERconResponseType.SERVERDATA_COMMAND:
        {
          if (decodedData.id === AUTH_PACKET_ID) {
            logger('Connection successful');
            onConnected();
          } else if (decodedData.id === -1) {
            logger('Authorization failed', ELoggerType.ERROR);
            reconnect();
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

          rconEmitter.emit('data', decodedData);

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
    logger('Ping connection');

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
  client.on('close', () => {
    onCloseConnection();
  });
  client.on('error', (error) => {
    onErrorConnection(error);
  });
  client.once('ready', onAuth);

  return {
    rconEmitter,
    execute,
    getListPlayers,
    getListSquads,
    client,
  };
};
