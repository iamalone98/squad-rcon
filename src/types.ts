export type TOptions = {
  host: string;
  port: number;
  password: string;
  pingDelay?: number;
};

export type TRconResponse = {
  id: number;
  type: ERconResponseType;
  size: number;
  body: string;
};

export type TListPlayer = {
  playerID: string;
  steamID: string;
  name: string;
  teamID: string;
  squadID: string | null;
  isLeader: boolean;
  role: string;
};

export type TListSquad = {
  squadID: string;
  squadName: string;
  size: string;
  locked: string;
  creatorName: string;
  creatorSteamID: string;
  teamID: string | null;
  teamName: string | null;
};

export type TResponseTaskQueue = (response: TRconResponse) => void;

export enum ERconResponseType {
  SERVERDATA_AUTH = 0x03,
  SERVERDATA_COMMAND = 0x02,
  SERVERDATA_SERVER = 0x01,
  SERVERDATA_RESPONSE = 0x00,
}
