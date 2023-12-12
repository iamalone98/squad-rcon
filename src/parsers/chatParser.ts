import EventEmitter from 'events';
import {
  TChatListeners,
  TChatMessage,
  TPlayerBanned,
  TPlayerKicked,
  TPlayerWarned,
  TPossessedAdminCamera,
  TRconResponse,
  TSquadCreated,
  TUnPossessedAdminCamera,
} from '../types';

export function chatParser(
  rconEmitter: EventEmitter,
  packet: TRconResponse,
  listeners?: TChatListeners,
) {
  const { body } = packet;

  const matchChat = body.match(
    /\[(ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \[Online IDs:EOS: ([0-9a-f]{32}) steam: (\d{17})\] (.+?) : (.*)/,
  );

  if (matchChat) {
    const data: TChatMessage = {
      raw: body,
      chat: matchChat[1],
      eosID: matchChat[2],
      steamID: matchChat[3],
      playerName: matchChat[4],
      message: matchChat[5],
      time: new Date(),
    };

    rconEmitter.emit('CHAT_MESSAGE', data);
    listeners?.onChatMessage?.(data);

    return;
  }

  const matchPossessedAdminCam = body.match(
    /\[Online Ids:EOS: ([0-9a-f]{32}) steam: (\d{17})\] (.+) has possessed admin camera\./,
  );

  if (matchPossessedAdminCam) {
    const data: TPossessedAdminCamera = {
      raw: body,
      eosID: matchPossessedAdminCam[1],
      steamID: matchPossessedAdminCam[2],
      playerName: matchPossessedAdminCam[3],
      time: new Date(),
    };

    rconEmitter.emit('POSSESSED_ADMIN_CAMERA', data);
    listeners?.onPossessedAdminCamera?.(data);

    return;
  }

  const matchUnpossessedAdminCam = body.match(
    /\[Online IDs:EOS: ([0-9a-f]{32}) steam: (\d{17})\] (.+) has unpossessed admin camera\./,
  );

  if (matchUnpossessedAdminCam) {
    const data: TUnPossessedAdminCamera = {
      raw: body,
      eosID: matchUnpossessedAdminCam[1],
      steamID: matchUnpossessedAdminCam[2],
      playerName: matchUnpossessedAdminCam[3],
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
    const data: TPlayerWarned = {
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
    /Kicked player ([0-9]+)\. \[Online IDs= EOS: ([0-9a-f]{32}) steam: (\d{17})] (.*)/,
  );

  if (matchKick) {
    const data: TPlayerKicked = {
      raw: body,
      playerID: matchKick[1],
      eosID: matchKick[2],
      steamID: matchKick[3],
      playerName: matchKick[4],
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
    const data: TPlayerBanned = {
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
    /(.+) \(Online IDs: EOS: ([0-9a-f]{32}) steam: (\d{17})\) has created Squad (\d+) \(Squad Name: (.+)\) on (.+)/,
  );

  if (matchSqCreated) {
    const data: TSquadCreated = {
      raw: body,
      playerName: matchSqCreated[1],
      eosID: matchSqCreated[2],
      steamID: matchSqCreated[3],
      squadID: matchSqCreated[4],
      squadName: matchSqCreated[5],
      teamName: matchSqCreated[6],
      time: new Date(),
    };

    rconEmitter.emit('SQUAD_CREATED', data);
    listeners?.onSquadCreated?.(data);

    return;
  }
}
