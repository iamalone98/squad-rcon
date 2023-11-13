import EventEmitter from 'events';
import { TChatListeners, TRconResponse } from '../types';

export function chatParser(
  rconEmitter: EventEmitter,
  packet: TRconResponse,
  listeners?: TChatListeners,
) {
  const { body } = packet;

  const matchChat = body.match(
    /\[(ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \[SteamID:([0-9]{17})] (.+?) : (.*)/,
  );

  if (matchChat) {
    const data = {
      raw: body,
      chat: matchChat[1],
      steamID: matchChat[2],
      playerName: matchChat[3],
      message: matchChat[4],
      time: new Date(),
    };

    rconEmitter.emit('CHAT_MESSAGE', data);
    listeners?.onChatMessage?.(data);

    return;
  }

  const matchPossessedAdminCam = body.match(
    /\[SteamID:([0-9]{17})] (.+?) has possessed admin camera./,
  );

  if (matchPossessedAdminCam) {
    const data = {
      raw: body,
      steamID: matchPossessedAdminCam[1],
      playerName: matchPossessedAdminCam[2],
      time: new Date(),
    };

    rconEmitter.emit('POSSESSED_ADMIN_CAMERA', data);
    listeners?.onPossessedAdminCamera?.(data);

    return;
  }

  const matchUnpossessedAdminCam = body.match(
    /\[SteamID:([0-9]{17})] (.+?) has unpossessed admin camera./,
  );

  if (matchUnpossessedAdminCam) {
    const data = {
      raw: body,
      steamID: matchUnpossessedAdminCam[1],
      playerName: matchUnpossessedAdminCam[2],
      time: new Date(),
    };

    rconEmitter.emit('UNPOSSESSED_ADMIN_CAMERA', data);
    listeners?.onUnPossessedAdminCamera?.(data);

    return;
  }

  const matchWarn = body.match(
    /Remote admin has warned player (.*)\. Message was "(.*)"/,
  );

  if (matchWarn) {
    const data = {
      raw: body,
      playerName: matchWarn[1],
      reason: matchWarn[2],
      time: new Date(),
    };

    rconEmitter.emit('PLAYER_WARNED', data);
    listeners?.onPlayerWarned?.(data);

    return;
  }

  const matchKick = body.match(
    /Kicked player ([0-9]+)\. \[steamid=([0-9]{17})] (.*)/,
  );

  if (matchKick) {
    const data = {
      raw: body,
      playerID: matchKick[1],
      steamID: matchKick[2],
      playerName: matchKick[3],
      time: new Date(),
    };

    rconEmitter.emit('PLAYER_KICKED', data);
    listeners?.onPlayerKicked?.(data);

    return;
  }

  const matchBan = body.match(
    /Banned player ([0-9]+)\. \[steamid=(.*?)\] (.*) for interval (.*)/,
  );

  if (matchBan) {
    const data = {
      raw: body,
      playerID: matchBan[1],
      steamID: matchBan[2],
      playerName: matchBan[3],
      interval: matchBan[4],
      time: new Date(),
    };

    rconEmitter.emit('PLAYER_BANNED', data);
    listeners?.onPlayerBanned?.(data);

    return;
  }

  const matchSqCreated = body.match(
    /(.+) \(Steam ID: ([0-9]{17})\) has created Squad (\d+) \(Squad Name: (.+)\) on (.+)/,
  );

  if (matchSqCreated) {
    const data = {
      raw: body,
      playerName: matchSqCreated[1],
      steamID: matchSqCreated[2],
      squadID: matchSqCreated[3],
      squadName: matchSqCreated[4],
      teamName: matchSqCreated[5],
      time: new Date(),
    };

    rconEmitter.emit('SQUAD_CREATED', data);
    listeners?.onSquadCreated?.(data);

    return;
  }
}
