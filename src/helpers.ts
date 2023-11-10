import EventEmitter from 'events';
import { RconResponse } from './types';

export const getListPlayers = (
  rconEmitter: EventEmitter,
  { body }: RconResponse,
) => {
  const players = [];

  for (const line of body.split('\n')) {
    const match = line.match(
      /ID: ([0-9]+) \| SteamID: ([0-9]{17}) \| Name: (.+) \| Team ID: ([0-9]+) \| Squad ID: ([0-9]+|N\/A) \| Is Leader: (True|False) \| Role: ([A-Za-z0-9_]*)\b/,
    );
    if (!match) continue;

    players.push({
      playerID: match[1],
      steamID: match[2],
      name: match[3],
      teamID: match[4],
      squadID: match[5] !== 'N/A' ? match[5] : null,
      isLeader: match[6] === 'True',
      role: match[7],
    });
  }

  rconEmitter.emit('ListPlayers', players);
};
