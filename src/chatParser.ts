import EventEmitter from 'events';
import { RconResponse } from './rcon/types';

export function chatParser(
  rconEmitter: EventEmitter,
  { body }: RconResponse,
) {
  const matchChat = body.match(
    /\[(ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \[SteamID:([0-9]{17})] (.+?) : (.*)/,
  );

  if (matchChat) {
    rconEmitter.emit('CHAT_MESSAGE', {
      raw: body,
      chat: matchChat[1],
      steamID: matchChat[2],
      name: matchChat[3],
      message: matchChat[4],
      time: new Date(),
    });

    return;
  }

  const matchPossessedAdminCam = body.match(
    /\[SteamID:([0-9]{17})] (.+?) has possessed admin camera./,
  );

  if (matchPossessedAdminCam) {
    rconEmitter.emit('POSSESSED_ADMIN_CAMERA', {
      raw: body,
      steamID: matchPossessedAdminCam[1],
      name: matchPossessedAdminCam[2],
      time: new Date(),
    });

    return;
  }

  const matchUnpossessedAdminCam = body.match(
    /\[SteamID:([0-9]{17})] (.+?) has unpossessed admin camera./,
  );

  if (matchUnpossessedAdminCam) {
    rconEmitter.emit('UNPOSSESSED_ADMIN_CAMERA', {
      raw: body,
      steamID: matchUnpossessedAdminCam[1],
      name: matchUnpossessedAdminCam[2],
      time: new Date(),
    });

    return;
  }

  const matchWarn = body.match(
    /Remote admin has warned player (.*)\. Message was "(.*)"/,
  );

  if (matchWarn) {
    rconEmitter.emit('PLAYER_WARNED', {
      raw: body,
      name: matchWarn[1],
      reason: matchWarn[2],
      time: new Date(),
    });

    return;
  }

  const matchKick = body.match(
    /Kicked player ([0-9]+)\. \[steamid=([0-9]{17})] (.*)/,
  );

  if (matchKick) {
    rconEmitter.emit('PLAYER_KICKED', {
      raw: body,
      playerID: matchKick[1],
      steamID: matchKick[2],
      name: matchKick[3],
      time: new Date(),
    });

    return;
  }

  const matchSqCreated = body.match(
    /(.+) \(Steam ID: ([0-9]{17})\) has created Squad (\d+) \(Squad Name: (.+)\) on (.+)/,
  );

  if (matchSqCreated) {
    rconEmitter.emit('SQUAD_CREATED', {
      time: new Date(),
      playerName: matchSqCreated[1],
      playerSteamID: matchSqCreated[2],
      squadID: matchSqCreated[3],
      squadName: matchSqCreated[4],
      teamName: matchSqCreated[5],
    });

    return;
  }

  const matchBan = body.match(
    /Banned player ([0-9]+)\. \[steamid=(.*?)\] (.*) for interval (.*)/,
  );

  if (matchBan) {
    rconEmitter.emit('PLAYER_BANNED', {
      raw: body,
      playerID: matchBan[1],
      steamID: matchBan[2],
      name: matchBan[3],
      interval: matchBan[4],
      time: new Date(),
    });
  }
}
