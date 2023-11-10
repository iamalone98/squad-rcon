import EventEmitter from 'events';
import net from 'net';
import { chatParser } from '../chatParser';
import { RconResponse } from './types';

type Options = {
  host: string;
  port: number;
  password: string;
  autoReconnectDelay?: number;
};

export class Rcon extends EventEmitter {
  host: string;
  password: string;
  port: number;
  client: net.Socket | null;
  stream: Buffer;
  type: {
    auth: number;
    command: number;
    response: number;
    server: number;
  };
  soh: {
    size: number;
    id: number;
    type: number;
    body: string;
  };
  connected: boolean;
  autoReconnect: boolean;
  autoReconnectDelay: number;
  autoReconnectTimeout: NodeJS.Timeout | undefined;
  msgId: number;
  responseString: { id: number; body: string } | null;

  constructor(options: Options) {
    super();
    for (const option of ['host', 'port', 'password'])
      if (!(option in options))
        throw new Error(`${option} must be specified.`);
    this.host = options.host;
    this.port = options.port;
    this.password = options.password;
    this.client = null;
    this.stream = Buffer.alloc(0);
    this.type = {
      auth: 0x03,
      command: 0x02,
      response: 0x00,
      server: 0x01,
    };
    this.soh = {
      size: 7,
      id: 0,
      type: this.type.response,
      body: '',
    };
    this.connected = false;
    this.autoReconnect = false;
    this.autoReconnectDelay =
      options.autoReconnectDelay || 5000;
    this.autoReconnectTimeout = undefined;
    this.msgId = 20;
    this.responseString = { id: 0, body: '' };
  }

  async connect() {
    return new Promise((resolve) => {
      const sendAuth = () => {
        this.client?.write(
          this._encode(
            this.type.auth,
            2147483647,
            this.password,
          ).toString('binary'),
          'binary',
        );
      };

      const onAuth = () => {
        console.log('test');
        clearTimeout(this.autoReconnectTimeout);
        this.connected = true;
      };
      const onError = (error: unknown) => {
        this.emit('RCON_ERROR', error);
      };

      const onEnd = () => {
        // Logger.verbose('RCON', 1, `Server sent FIN packet.`);
      };

      const onClose = () => {
        this.connected = false;
        clearTimeout(this.autoReconnectTimeout);
        if (this.autoReconnect) {
          this.autoReconnectTimeout = setTimeout(
            () => init(),
            this.autoReconnectDelay,
          );
        }
      };
      const init = () => {
        if (
          this.client &&
          this.connected &&
          !this.client.destroyed
        )
          return;
        this.autoReconnect = true;
        this.client = net
          .createConnection({
            port: this.port,
            host: this.host,
            noDelay: true,
          })
          .on('data', (data) => this._onData(data))
          .once('ready', () => sendAuth())
          .once('auth', () => resolve(onAuth()))
          .once('error', (error) => onError(error))
          .once('end', () => onEnd())
          .once('close', () => onClose());
      };
      init();
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      clearTimeout(this.autoReconnectTimeout);
      this.autoReconnect = false;
      if (this.client) {
        this.client.end();
      }
      this.connected = false;
      resolve(0);
    });
  }

  async execute(body: string) {
    return new Promise((resolve, reject) => {
      if (!this.connected)
        return reject(new Error('Rcon not connected.'));
      if (!this.client?.writable)
        return reject(
          new Error('Unable to write to node:net socket.'),
        );
      const bodyString = String(body);
      const length = Buffer.from(bodyString).length;
      if (length > 4096)
        console.log(
          'RCON',
          `Error occurred. Oversize, "${length}" > 4096.`,
        );
      else {
        const outputData = (data: unknown) => {
          clearTimeout(timeOut);
          console.log(data, 'aa');
          resolve(data);
        };
        const timedOut = () => {
          this.removeListener(listenerId, outputData);
          return reject(
            new Error(`Rcon response timed out`),
          );
        };
        if (this.msgId > 80) this.msgId = 20;
        const listenerId = `response${this.msgId}`;
        const timeOut = setTimeout(timedOut, 50000);
        this.client.once(listenerId, outputData);
        this._send(bodyString, this.msgId);
        this.msgId++;
      }
    });
  }

  _send(body: string, id = 99) {
    this._write(this.type.command, id, body);
    this._write(this.type.command, id + 2, body);
  }

  _write(type: number, id: number, body: string) {
    this.client?.write(
      this._encode(type, id, body).toString('binary'),
      'binary',
    );
  }

  _encode(type: number, id: number, body = '') {
    const size = Buffer.byteLength(body) + 14;
    const buffer = Buffer.alloc(size);
    buffer.writeInt32LE(size - 4, 0);
    buffer.writeInt32LE(id, 4);
    buffer.writeInt32LE(type, 8);
    buffer.write(body, 12, size - 2, 'utf8');
    buffer.writeInt16LE(0, size - 2);
    return buffer;
  }

  _onData(data: Buffer) {
    this.stream = Buffer.concat(
      [this.stream, data],
      this.stream.byteLength + data.byteLength,
    );
    while (this.stream.byteLength >= 7) {
      const packet = this._decode();
      if (!packet) break;
      else if (packet.type === this.type.response)
        this._onResponse(packet);
      else if (packet.type === this.type.server)
        chatParser.call(this, packet);
      else if (
        packet.type === this.type.command &&
        this.client
      )
        this.client.emit('auth');
    }
  }

  _decode() {
    if (
      this.stream[0] === 0 &&
      this.stream[1] === 1 &&
      this.stream[2] === 0 &&
      this.stream[3] === 0 &&
      this.stream[4] === 0 &&
      this.stream[5] === 0 &&
      this.stream[6] === 0
    ) {
      this.stream = this.stream.subarray(7);
      return this.soh;
    }
    const bufSize = this.stream.readInt32LE(0);
    if (bufSize > 8192 || bufSize < 10)
      return this._badPacket();
    else if (bufSize <= this.stream.byteLength - 4) {
      const bufId = this.stream.readInt32LE(4);
      const bufType = this.stream.readInt32LE(8);
      if (
        this.stream[bufSize + 2] !== 0 ||
        this.stream[bufSize + 3] !== 0 ||
        bufId < 0 ||
        bufType < 0 ||
        bufType > 5
      )
        return this._badPacket();
      else {
        const response = {
          size: bufSize,
          id: bufId,
          type: bufType,
          body: this.stream.toString(
            'utf8',
            12,
            bufSize + 2,
          ),
        };
        this.stream = this.stream.subarray(bufSize + 4);
        return response;
      }
    } else return null;
  }

  _onResponse(packet: RconResponse) {
    console.log(packet, 'aaaa');
    if (this.responseString) {
      if (packet.body === '') {
        this.client?.emit(
          `response${this.responseString.id - 2}`,
          this.responseString.body,
        );
        this.responseString.body = '';
      } else if (!packet.body.includes('')) {
        this.responseString.body =
          this.responseString.body += packet.body;
        this.responseString.id = packet.id;
      } else this._badPacket();
    }
  }

  _badPacket() {
    this.stream = Buffer.alloc(0);
    this.responseString = null;
    return null;
  }

  // _bufToHexString(buf) {
  //   return buf.toString('hex').match(/../g).join(' ');
  // }

  async warn(steamID: string, message: string) {
    await this.execute(`AdminWarn "${steamID}" ${message}`);
  }

  async kick(steamID: string, reason: string) {
    await this.execute(`AdminKick "${steamID}" ${reason}`);
  }

  async forceTeamChange(steamID: string) {
    await this.execute(`AdminForceTeamChange "${steamID}"`);
  }

  async disband(teamID: string, squadID: string) {
    await this.execute(
      `AdminDisbandSquad  "${teamID}" ${squadID}`,
    );
  }

  async endMatch() {
    await this.execute('AdminEndMatch');
  }

  async setNextLayer(layer: string) {
    await this.execute(`AdminSetNextLayer ${layer}`);
  }

  async setCurrentLayer(layer: string) {
    await this.execute(`AdminChangeLayer ${layer}`);
  }

  async getNextLayer() {
    await this.execute('ShowNextMap');
  }
}
