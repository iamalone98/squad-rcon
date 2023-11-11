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
  playerName: string;
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

export type TChatMessage = {
  raw: string;
  chat: string;
  steamID: string;
  playerName: string;
  message: string;
  time: string;
};

export type TPossessedAdminCamera = {
  raw: string;
  steamID: string;
  playerName: string;
  time: string;
};

export type TUnPossessedAdminCamera = {
  raw: string;
  steamID: string;
  playerName: string;
  time: string;
};

export type TPlayerWarned = {
  raw: string;
  reason: string;
  playerName: string;
  time: string;
};

export type TPlayerKicked = {
  raw: string;
  playerID: string;
  steamID: string;
  playerName: string;
  time: string;
};

export type TSquadCreated = {
  raw: string;
  playerName: string;
  steamID: string;
  squadID: string;
  squadName: string;
  teamName: string;
  time: string;
};

export type TPlayerBanned = {
  raw: string;
  playerID: string;
  steamID: string;
  playerName: string;
  interval: string;
  time: string;
};

export type TResponseTaskQueue = (response: TRconResponse) => void;

export enum ERconResponseType {
  SERVERDATA_AUTH = 0x03,
  SERVERDATA_COMMAND = 0x02,
  SERVERDATA_SERVER = 0x01,
  SERVERDATA_RESPONSE = 0x00,
}
