export type Options = {
  host: string;
  port: number;
  password: string;
};

export type RconResponse = {
  id: number;
  type: ERconResponseType;
  size: number;
  body: string;
};

export enum ERconResponseType {
  SERVERDATA_AUTH = 0x03,
  SERVERDATA_COMMAND = 0x02,
  SERVERDATA_SERVER = 0x01,
  SERVERDATA_RESPONSE = 0x00,
}
