export type TRconOptions = {
  id: number;
  host: string;
  port: number;
  password: string;
  pingDelay?: number;
  autoReconnect?: boolean;
  autoReconnectDelay?: number;
  logEnabled?: boolean;
  chatListeners?: TChatListeners;
};

export type TChatListeners = {
  onChatMessage?: (data: TChatMessage) => void;
  onPlayerWarned?: (data: TPlayerWarned) => void;
  onPlayerKicked?: (data: TPlayerKicked) => void;
  onPlayerBanned?: (data: TPlayerBanned) => void;
  onSquadCreated?: (data: TSquadCreated) => void;
  onPossessedAdminCamera?: (data: TPossessedAdminCamera) => void;
  onUnPossessedAdminCamera?: (data: TUnPossessedAdminCamera) => void;
};

export type TRconResponse = {
  id: number;
  type: ERconResponseType;
  size: number;
  body: string;
};

export type TPlayer = {
  playerID: string;
  eosID: string;
  steamID: string;
  name: string;
  teamID: string;
  squadID: string | null;
  isLeader: boolean;
  role: string;
};

export type TSquad = {
  squadID: string;
  squadName: string;
  size: string;
  locked: string;
  creatorName: string;
  creatorEOSID: string;
  creatorSteamID: string;
  teamID: string | null;
  teamName: string | null;
};

export type TChatMessage = {
  raw: string;
  chat: string;
  eosID: string;
  steamID: string;
  name: string;
  message: string;
  time: Date;
};

export type TPossessedAdminCamera = {
  raw: string;
  eosID: string;
  steamID: string;
  name: string;
  time: Date;
};

export type TUnPossessedAdminCamera = {
  raw: string;
  eosID: string;
  steamID: string;
  name: string;
  time: Date;
};

export type TPlayerWarned = {
  raw: string;
  reason: string;
  name: string;
  time: Date;
};

export type TPlayerKicked = {
  raw: string;
  playerID: string;
  eosID: string;
  steamID: string;
  name: string;
  time: Date;
};

export type TSquadCreated = {
  raw: string;
  name: string;
  eosID: string;
  steamID: string;
  squadID: string;
  squadName: string;
  teamName: string;
  time: Date;
};

export type TPlayerBanned = {
  raw: string;
  playerID: string;
  steamID: string;
  name: string;
  interval: string;
  time: Date;
};

export type TMap = {
  level: string | null;
  layer: string | null;
};

export type TServerInfo = {
  serverName: string;
  maxPlayers: number;
  publicQueueLimit: number;
  reserveSlots: number;
  playerCount: number;
  a2sPlayerCount: number;
  publicQueue: number;
  reserveQueue: number;
  currentLayer: string;
  nextLayer: string;
  teamOne: string;
  teamTwo: string;
  matchTimeout: number;
  matchStartTime: number;
  gameVersion: string;
};

export type TResponseTaskQueue = (response: string) => void;

export enum ERconResponseType {
  SERVERDATA_AUTH = 0x03,
  SERVERDATA_COMMAND = 0x02,
  SERVERDATA_SERVER = 0x01,
  SERVERDATA_RESPONSE = 0x00,
}
