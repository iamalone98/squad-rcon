import EventEmitter from 'events';
import { TListPlayer, TListSquad, TRconResponse } from '../types';

const getListPlayers = (
  rconEmitter: EventEmitter,
  { body }: TRconResponse,
) => {
  const players: TListPlayer[] = [];

  for (const line of body.split('\n')) {
    const match = line.match(
      /ID: ([0-9]+) \| SteamID: ([0-9]{17}) \| Name: (.+) \| Team ID: ([0-9]+) \| Squad ID: ([0-9]+|N\/A) \| Is Leader: (True|False) \| Role: ([A-Za-z0-9_]*)\b/,
    );
    if (!match) continue;

    players.push({
      playerID: match[1],
      steamID: match[2],
      playerName: match[3],
      teamID: match[4],
      squadID: match[5] !== 'N/A' ? match[5] : null,
      isLeader: match[6] === 'True',
      role: match[7],
    });
  }

  rconEmitter.emit('ListPlayers', players);

  return players;
};

const getListSquads = (
  rconEmitter: EventEmitter,
  { body }: TRconResponse,
) => {
  const squads: TListSquad[] = [];
  let teamName: string | null = null;
  let teamID: string | null = null;

  for (const line of body.split('\n')) {
    const match = line.match(
      /ID: ([0-9]+) \| Name: (.+) \| Size: ([0-9]+) \| Locked: (True|False) \| Creator Name: (.+) \| Creator Steam ID: ([0-9]{17})/,
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
      creatorSteamID: match[6],
      teamID: teamID,
      teamName: teamName,
    });
  }

  rconEmitter.emit('ListSquads', squads);

  return squads;
};

export const helpers = {
  getListPlayers,
  getListSquads,
};
