import EventEmitter from 'events';
import net from 'net';
import { chatParser } from './chatParser';
import { commandsParser } from './commandsParser';
import { ERconResponseType, Options } from './types';
import { decode, encode } from './utils';

const EMPTY_PACKET_ID = 69;

export const Rcon = (options: Options) => {
  const { host, port, password } = options;
  const rconEmitter = new EventEmitter();
  const client: net.Socket = net.createConnection({
    host,
    port,
    noDelay: true,
  });

  const responseTaskQueue: Array<
    (response: unknown) => void
  > = [];

  let lastDataBuffer = Buffer.alloc(0);

  const onAuth = () => {
    client.write(
      encode(
        ERconResponseType.SERVERDATA_AUTH,
        555,
        password,
      ),
    );
  };

  const onConnected = () => {
    rconEmitter.emit('connected');
  };

  const onData = (data: Buffer) => {
    const decodedData = decode(data);

    if (
      decodedData.type ===
        ERconResponseType.SERVERDATA_COMMAND &&
      decodedData.size === 10
    ) {
      onConnected();
    }

    if (
      decodedData.type ===
      ERconResponseType.SERVERDATA_SERVER
    ) {
      chatParser(rconEmitter, decodedData);
      rconEmitter.emit('data', decodedData);
    }

    if (decodedData.id === EMPTY_PACKET_ID) {
      if (lastDataBuffer.byteLength >= 1) {
        const lastDataDecoded = decode(lastDataBuffer);

        commandsParser(rconEmitter, lastDataDecoded);
        rconEmitter.emit('data', lastDataDecoded);

        responseTaskQueue.shift()?.(lastDataDecoded);
        lastDataBuffer = Buffer.alloc(0);
      }
    } else {
      lastDataBuffer = Buffer.concat(
        [lastDataBuffer, data],
        lastDataBuffer.byteLength + data.byteLength,
      );
    }
  };

  const execute = (command: string) => {
    return new Promise((resolve) => {
      responseTaskQueue.push((response: unknown) =>
        resolve(response),
      );

      client.write(
        encode(
          ERconResponseType.SERVERDATA_COMMAND,
          999,
          command,
        ),
      );

      client.write(
        encode(
          ERconResponseType.SERVERDATA_COMMAND,
          69,
          '',
        ),
      );
    });
  };

  client.on('data', onData);
  client.once('ready', onAuth);

  return {
    rconEmitter,
    execute,
  };
};
