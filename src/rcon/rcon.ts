import EventEmitter from 'events';
import net from 'net';
import { CONFIG } from '../config';
import { logger } from '../logger';
import {
  ERconResponseType,
  TRconOptions,
  TRconResponse,
  TResponseTaskQueue,
} from '../types';
import { chatParser, commandParser, helpers } from './parsers';
import { decode, encode } from './utils';

const EMPTY_PACKET_ID = 100;
const AUTH_PACKET_ID = 101;
const PING_PACKET_ID = 102;

export const Rcon = (options: TRconOptions, _isPromise?: boolean) => {
  const {
    host,
    port,
    password,
    pingDelay,
    autoReconnect = true,
    autoReconnectDelay = 10000,
    logEnabled,
    chatListeners,
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

  logger.log('Connecting');

  let commandId = 0;
  let lastDataBuffer = Buffer.alloc(0);
  let connected = false;
  let timerPing: NodeJS.Timeout;

  const onAuth = () => {
    logger.log('Authorization in progress');

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
    logger.error('Connection close');

    reconnect();
  };

  const onErrorConnection = (error?: Error) => {
    rconEmitter.emit('err', error);
    logger.error('Connection error');
  };

  const reconnect = () => {
    connected = false;

    if (autoReconnect && !connected && !_isPromise) {
      setTimeout(() => {
        client.end();
        logger.log('Reconnecting');
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
            logger.log('Authorization successful');
            onConnected();
          } else if (decodedData.id === -1) {
            logger.error('Authorization failed');
            reconnect();
          }
        }
        break;

      case ERconResponseType.SERVERDATA_SERVER:
        {
          if (decodedData.body.includes('\x00')) {
            onData(
              encode(
                ERconResponseType.SERVERDATA_SERVER,
                0,
                decodedData.body.slice(
                  0,
                  decodedData.body.indexOf('\x00'),
                ),
              ),
            );
            onData(
              encode(
                ERconResponseType.SERVERDATA_SERVER,
                0,
                decodedData.body.slice(
                  decodedData.body.lastIndexOf('\x00') + 1,
                ),
              ),
            );
          } else {
            chatParser(rconEmitter, decodedData, chatListeners);
            rconEmitter.emit('data', decodedData);
          }
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
    logger.log('Ping connection');

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
