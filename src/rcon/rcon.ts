/*
  Packets parser Author: Matttor
  github: https://github.com/Matttor
*/

import EventEmitter from 'events';
import net from 'net';
import { initLogger } from '../logger';
import {
  ERconResponseType,
  TRconOptions,
  TRconResponse,
  TResponseTaskQueue,
} from '../types';
import { chatParser, commandParser, helpers } from './parsers';
import { encode } from './utils';

const EMPTY_PACKET_ID = 100;
const AUTH_PACKET_ID = 101;
const PING_PACKET_ID = 102;

export const Rcon = (options: TRconOptions, _isPromise?: boolean) => {
  const {
    id,
    host,
    port,
    password,
    pingDelay,
    autoReconnect = true,
    autoReconnectDelay = 10000,
    logEnabled,
    chatListeners,
  } = options;

  const logger = initLogger(
    id,
    typeof logEnabled === 'undefined' ? true : logEnabled,
  );

  const rconEmitter = new EventEmitter();
  const responseTaskQueue: TResponseTaskQueue[] = [];
  const lastCommands: string[] = [];
  const client: net.Socket = net.createConnection({
    host,
    port,
    noDelay: true,
  });

  logger.log('Connecting');

  const soh = {
    size: 7,
    id: 0,
    type: ERconResponseType.SERVERDATA_RESPONSE,
    body: '',
  };

  let commandId = 0;
  let responseBody = '';
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
    if (!connected) {
      connected = true;
      rconEmitter.emit('connected');
      timerPing = setInterval(
        () => {
          ping();
        },
        pingDelay || 60000 * 2,
      );
    }
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

  const decode = (): TRconResponse | null => {
    if (
      lastDataBuffer[0] === 0 &&
      lastDataBuffer[1] === 1 &&
      lastDataBuffer[2] === 0 &&
      lastDataBuffer[3] === 0 &&
      lastDataBuffer[4] === 0 &&
      lastDataBuffer[5] === 0 &&
      lastDataBuffer[6] === 0
    ) {
      lastDataBuffer = lastDataBuffer.subarray(7);
      return soh;
    }
    const bufSize = lastDataBuffer.readInt32LE(0);
    if (bufSize > 8192 || bufSize < 10) {
      badPacket();
      return null;
    } else if (bufSize <= lastDataBuffer.byteLength - 4) {
      const bufId = lastDataBuffer.readInt32LE(4);
      const bufType = lastDataBuffer.readInt32LE(8);
      if (
        lastDataBuffer[bufSize + 2] !== 0 ||
        lastDataBuffer[bufSize + 3] !== 0 ||
        bufId < 0 ||
        bufType < 0 ||
        bufType > 5
      ) {
        badPacket();
        return null;
      } else {
        const response = {
          size: bufSize,
          id: bufId,
          type: bufType,
          body: lastDataBuffer.toString('utf8', 12, bufSize + 2),
        };
        lastDataBuffer = lastDataBuffer.subarray(bufSize + 4);
        return response;
      }
    } else return null;
  };

  const badPacket = () => {
    logger.error('Bad packet');
    lastDataBuffer = Buffer.alloc(0);
    return null;
  };

  const onData = (data: Buffer) => {
    lastDataBuffer = Buffer.concat(
      [lastDataBuffer, data],
      lastDataBuffer.byteLength + data.byteLength,
    );

    while (lastDataBuffer.byteLength >= 7) {
      const packet = decode();
      if (!packet) break;

      if (packet.type === ERconResponseType.SERVERDATA_RESPONSE)
        onResponse(packet);
      else if (packet.type === ERconResponseType.SERVERDATA_SERVER) {
        chatParser(rconEmitter, packet, chatListeners);
        rconEmitter.emit('data', packet);
      } else if (
        packet.type === ERconResponseType.SERVERDATA_COMMAND
      ) {
        if (packet.id === AUTH_PACKET_ID) {
          logger.log('Authorization successful');
          onConnected();
        } else if (packet.id === -1) {
          logger.error('Authorization failed');
          reconnect();
        }
      }
    }
  };

  const onResponse = (packet: TRconResponse) => {
    if (packet.body === '') {
      commandParser(rconEmitter, responseBody, lastCommands[0]);
      lastCommands.shift();
      responseTaskQueue.shift()?.(responseBody);
      responseBody = '';
    } else if (!packet.body.includes('')) {
      responseBody = responseBody += packet.body;
    } else badPacket();
  };

  const execute = (command: string): Promise<string> => {
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

  const getCurrentMap = async () => {
    const response = await execute('ShowCurrentMap');

    return helpers.getCurrentMap(rconEmitter, response);
  };

  const getNextMap = async () => {
    const response = await execute('ShowNextMap');

    return helpers.getNextMap(rconEmitter, response);
  };

  const close = () =>
    new Promise((res) => {
      rconEmitter.on('close', () => res(true));
      client.end();
    });

  client.on('data', onData);
  client.on('close', () => {
    onCloseConnection();
  });
  client.on('end', () => {
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
    getCurrentMap,
    getNextMap,
    client,
    close,
  };
};
