import EventEmitter from 'events';
import { RconEvents } from '../../events';
import { TMap, TPlayer, TSquad } from '../../types';

const getListPlayers = (rconEmitter: EventEmitter, body: string) => {
  const players: TPlayer[] = [];

  for (const line of body.split('\n')) {
    const match = line.match(
      /ID: ([0-9]+) \| Online IDs: EOS: ([0-9a-f]{32}) steam: (\d{17}) \| Name: (.+) \| Team ID: ([0-9]+) \| Squad ID: ([0-9]+|N\/A) \| Is Leader: (True|False) \| Role: ([A-Za-z0-9_]*)\b/,
    );
    if (!match) continue;

    players.push({
      playerID: match[1],
      eosID: match[2],
      steamID: match[3],
      name: match[4],
      teamID: match[5],
      squadID: match[6] !== 'N/A' ? match[6] : null,
      isLeader: match[7] === 'True',
      role: match[8],
    });
  }

  rconEmitter.emit(RconEvents.LIST_PLAYERS, players);

  return players;
};

const getListSquads = (rconEmitter: EventEmitter, body: string) => {
  const squads: TSquad[] = [];
  let teamName: string | null = null;
  let teamID: string | null = null;

  for (const line of body.split('\n')) {
    const match = line.match(
      /ID: ([0-9]+) \| Name: (.+) \| Size: ([0-9]+) \| Locked: (True|False) \| Creator Name: (.+) \| Creator Online IDs: EOS: ([0-9a-f]{32}) steam: (\d{17})/,
    );
    const matchSide = line.match(/Team ID: (1|2) \((.+)\)/);

    if (matchSide) {
      teamID = matchSide[1];
      teamName = matchSide[2];
    }

    if (!match) continue;

    squads.push({
      squadID: match[1],
      squadName: match[2],
      size: match[3],
      locked: match[4],
      creatorName: match[5],
      creatorEOSID: match[6],
      creatorSteamID: match[7],
      teamID: teamID,
      teamName: teamName,
    });
  }

  rconEmitter.emit(RconEvents.LIST_SQUADS, squads);

  return squads;
};

const getCurrentMap = (rconEmitter: EventEmitter, body: string) => {
  const match = body.match(/^Current level is (.*), layer is (.*)/);
  let data: TMap = {
    level: null,
    layer: null,
  };

  if (match) {
    data = { level: match[1], layer: match[2] };
  }

  rconEmitter.emit(RconEvents.SHOW_CURRENT_MAP, data);
  return data;
};

const getNextMap = (rconEmitter: EventEmitter, body: string) => {
  const match = body.match(/^Next level is (.*), layer is (.*)/);
  let data: TMap = {
    level: null,
    layer: null,
  };

  if (match) {
    data = {
      level: match[1] !== '' ? match[1] : null,
      layer: match[2] !== 'To be voted' ? match[2] : null,
    };
  }

  rconEmitter.emit(RconEvents.SHOW_NEXT_MAP, data);
  return data;
};

export const helpers = {
  getListPlayers,
  getListSquads,
  getCurrentMap,
  getNextMap,
};
