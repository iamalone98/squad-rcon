import EventEmitter from 'events';
import net from 'net';
import { initLogger } from '../logger';
import {
  ERconResponseType,
  TChatListeners,
  TRconOptions,
  TRconResponse,
  TResponseTaskQueue,
} from '../types';
import { chatParser, commandParser, helpers } from './parsers';

const EMPTY_PACKET_ID = 100;
const AUTH_PACKET_ID = 101;

export class Rcon extends EventEmitter {
  readonly id: number;
  private client?: net.Socket;

  private readonly host: string;
  private readonly port: number;
  private readonly password: string;
  private readonly pingDelay?: number;
  private readonly autoReconnect?: boolean;
  private readonly autoReconnectDelay?: number;
  private readonly chatListeners?: TChatListeners;

  private readonly soh = {
    size: 7,
    id: 0,
    type: ERconResponseType.SERVERDATA_RESPONSE,
    body: '',
  };
  private readonly logger: ReturnType<typeof initLogger>;
  private commandId = 0;
  private responseBody = '';
  private connected = false;
  private lastDataBuffer = Buffer.alloc(0);
  private timerPing?: NodeJS.Timeout;
  private responseTaskQueue: TResponseTaskQueue[] = [];
  private lastCommands: string[] = [];

  constructor(options: TRconOptions) {
    super();

    for (const option of ['id', 'host', 'port', 'password'])
      if (!(option in options))
        throw new Error(`${option} required!`);

    const {
      id,
      host,
      port,
      password,
      pingDelay,
      autoReconnect = true,
      autoReconnectDelay = 10000,
      logEnabled,
    } = options;

    this.id = id;
    this.host = host;
    this.port = port;
    this.password = password;
    this.pingDelay = pingDelay;
    this.autoReconnect = autoReconnect;
    this.autoReconnectDelay = autoReconnectDelay;
    this.chatListeners = this.chatListeners;
    this.logger = initLogger(
      id,
      typeof logEnabled === 'undefined' ? true : logEnabled,
    );
  }

  init() {
    return new Promise((res, rej) => {
      this.once('connected', () => res(true));
      this.once('close', () => rej('Connection error'));

      this.connect();
    });
  }

  close() {
    return new Promise((res) => {
      this.once('close', () => res(true));
      this.client?.end();
    });
  }

  execute(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.lastCommands.push(command);
      this.responseTaskQueue.push((response) => {
        if (!this.connected) {
          reject();
        }

        resolve(response);
      });

      this.commandId = this.commandId >= 80 ? 1 : this.commandId + 1;

      this.client?.write(
        this.encode(
          ERconResponseType.SERVERDATA_COMMAND,
          this.commandId,
          command,
        ),
      );

      this.client?.write(
        this.encode(
          ERconResponseType.SERVERDATA_COMMAND,
          EMPTY_PACKET_ID,
          '',
        ),
      );
    });
  }

  async getListPlayers() {
    const response = await this.execute('ListPlayers');

    return helpers.getListPlayers(this, response);
  }

  async getListSquads() {
    const response = await this.execute('ListSquads');

    return helpers.getListSquads(this, response);
  }

  async getCurrentMap() {
    const response = await this.execute('ShowCurrentMap');

    return helpers.getCurrentMap(this, response);
  }

  async getNextMap() {
    const response = await this.execute('ShowNextMap');

    return helpers.getNextMap(this, response);
  }

  async getServerInfo() {
    const response = await this.execute('ShowServerInfo');

    return helpers.getServerInfo(this, response);
  }

  private connect() {
    this.client = net.createConnection({
      host: this.host,
      port: this.port,
      noDelay: true,
    });

    this.logger.log('Connecting');

    this.client.on('data', (data) => {
      this.onData(data);
    });
    this.client.on('close', () => {
      this.onCloseConnection();
    });
    this.client.on('error', (error) => {
      this.onErrorConnection(error);
    });
    this.client.once('ready', () => {
      this.onAuth();
    });
  }

  private reconnect() {
    this.connected = false;

    if (this.autoReconnect && !this.connected) {
      setTimeout(() => {
        this.client?.end();
        this.logger.log('Reconnecting');
        this.connect();
      }, this.autoReconnectDelay);
    }

    clearInterval(this.timerPing);
  }

  private onData(data: Buffer) {
    this.lastDataBuffer = Buffer.concat(
      [this.lastDataBuffer, data],
      this.lastDataBuffer.byteLength + data.byteLength,
    );

    while (this.lastDataBuffer.byteLength >= 7) {
      const packet = this.decode();
      if (!packet) break;

      if (packet.type === ERconResponseType.SERVERDATA_RESPONSE)
        this.onResponse(packet);
      else if (packet.type === ERconResponseType.SERVERDATA_SERVER) {
        chatParser(this, packet, this.chatListeners);
        this.emit('data', packet);
      } else if (
        packet.type === ERconResponseType.SERVERDATA_COMMAND
      ) {
        if (packet.id === AUTH_PACKET_ID) {
          this.logger.log('Authorization successful');
          this.onConnected();
        } else if (packet.id === -1) {
          this.logger.error('Authorization failed');
          this.reconnect();
        }
      }
    }
  }

  private onResponse(packet: TRconResponse) {
    if (packet.body === '') {
      commandParser(this, this.responseBody, this.lastCommands[0]);
      this.lastCommands.shift();
      this.responseTaskQueue.shift()?.(this.responseBody);
      this.responseBody = '';
    } else if (!packet.body.includes('')) {
      this.responseBody = this.responseBody += packet.body;
    } else this.badPacket();
  }

  private onConnected() {
    if (!this.connected) {
      this.connected = true;
      this.emit('connected');
      this.timerPing = setInterval(
        () => {
          this.ping();
        },
        this.pingDelay || 60000 * 2,
      );
    }
  }

  private onAuth() {
    this.logger.log('Authorization in progress');

    this.client?.write(
      this.encode(
        ERconResponseType.SERVERDATA_AUTH,
        AUTH_PACKET_ID,
        this.password,
      ),
    );
  }

  private onCloseConnection() {
    this.emit('close');
    this.logger.error('Connection close');
    this.reconnect();
  }

  private onErrorConnection(error?: Error) {
    this.emit('err', error);
    this.logger.error('Connection error');
  }

  private encode = (type: number, id: number, body: string) => {
    const size = Buffer.byteLength(body) + 14;
    const buf = Buffer.alloc(size);

    buf.writeInt32LE(size - 4, 0);
    buf.writeInt32LE(id, 4);
    buf.writeInt32LE(type, 8);
    buf.write(body, 12, size - 2, 'utf-8');
    buf.writeInt16LE(0, size - 2);

    return buf;
  };

  private decode(): TRconResponse | null {
    if (
      this.lastDataBuffer[0] === 0 &&
      this.lastDataBuffer[1] === 1 &&
      this.lastDataBuffer[2] === 0 &&
      this.lastDataBuffer[3] === 0 &&
      this.lastDataBuffer[4] === 0 &&
      this.lastDataBuffer[5] === 0 &&
      this.lastDataBuffer[6] === 0
    ) {
      this.lastDataBuffer = this.lastDataBuffer.subarray(7);
      return this.soh;
    }
    const bufSize = this.lastDataBuffer.readInt32LE(0);
    if (bufSize > 8192 || bufSize < 10) {
      this.badPacket();
      return null;
    } else if (bufSize <= this.lastDataBuffer.byteLength - 4) {
      const bufId = this.lastDataBuffer.readInt32LE(4);
      const bufType = this.lastDataBuffer.readInt32LE(8);
      if (
        this.lastDataBuffer[bufSize + 2] !== 0 ||
        this.lastDataBuffer[bufSize + 3] !== 0 ||
        bufId < 0 ||
        bufType < 0 ||
        bufType > 5
      ) {
        this.badPacket();
        return null;
      } else {
        const response = {
          size: bufSize,
          id: bufId,
          type: bufType,
          body: this.lastDataBuffer.toString('utf8', 12, bufSize + 2),
        };
        this.lastDataBuffer = this.lastDataBuffer.subarray(
          bufSize + 4,
        );
        return response;
      }
    } else return null;
  }

  private badPacket() {
    this.logger.error('Bad packet');
    this.lastDataBuffer = Buffer.alloc(0);
    return null;
  }

  private ping() {
    this.logger.log('Ping connection');

    this.execute('PING_CONNECTION');
  }
}
