# SquadRcon

This library is designed for the game Squad, it will give you the ability to easily connect to Rcon and parse/execute commands. I hope it will be useful to you!

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/).

If this is a brand new project, make sure to create a `package.json` first with
the [`npm init` command](https://docs.npmjs.com/creating-a-package-json-file).

Installation is done using the

```console
$ npm install squad-rcon
```

or

```console
$ yarn add squad-rcon
```

## Quick Start

```typescript
import { Rcon } from 'squad-rcon';

(async () => {
  try {
    const rcon = new Rcon({
      id: 1,
      host: '127.0.0.1',
      port: 1111,
      password: 'qwerty',
    });

    await rcon.init();

    rcon.on('ListPlayers', (data) => {
      console.log(data);
    });

    rcon.execute('ListPlayers');
  } catch (e: unknown) {
    console.log(e);
  }
})();
```

## API

#### Initialization

```typescript
import { Rcon } from 'squad-rcon';

Rcon({
  id: 1,
  host: '127.0.0.1',
  port: 1111,
  password: 'qwerty',
  pingDelay: 60000, // optional
  autoReconnect: true, // optional
  autoReconnectDelay: 60000, // optional
  logEnabled: true, // optional
  chatListeners: {
    onChatMessage: (data: TChatMessage) => null, // optional
    onPlayerWarned: (data: TPlayerWarned) => null, // optional
    onPlayerKicked: (data: TPlayerKicked) => null, // optional
    onPlayerBanned: (data: TPlayerBanned) => null, // optional
    onSquadCreated: (data: TSquadCreated) => null, // optional
    onPossessedAdminCamera: (data: TPossessedAdminCamera) => null, // optional
    onUnPossessedAdminCamera: (data: TUnPossessedAdminCamera) => null, // optional
  }, // optional
});
```

`Rcon` return some pre-defined functions:

#### Functions

| Function           | Return      | Type              | Emitter                |
| ------------------ | ----------- | ----------------- | ---------------------- |
| **init**           | **Promise** | `Promise`         |                        |
| **close**          | **Promise** | `Promise`         |                        |
| **rconEmitter**    | **Emitter** | `EventEmitter`    | `on()`                 |
| **execute**        | **Promise** | `Promise<string>` | `on('data')`           |
| **getListPlayers** | **Promise** | `TPlayer[]`       | `on('ListPlayers')`    |
| **getListSquads**  | **Promise** | `TSquad[]`        | `on('ListSquads')`     |
| **getCurrentMap**  | **Promise** | `TMap`            | `on('ShowCurrentMap')` |
| **getNextSquads**  | **Promise** | `TMap`            | `on('ShowNextMap')`    |

#### Events Emitter

| Event                        | Return       | Type                      |
| ---------------------------- | ------------ | ------------------------- |
| **ListPlayers**              | **response** | `TPlayer[]`               |
| **ListSquads**               | **response** | `TSquad[]`                |
| **ShowCurrentMap**           | **response** | `TMap`                    |
| **ShowNextMap**              | **response** | `TMap`                    |
| **CHAT_MESSAGE**             | **response** | `TChatMessage`            |
| **POSSESSED_ADMIN_CAMERA**   | **response** | `TPossessedAdminCamera`   |
| **UNPOSSESSED_ADMIN_CAMERA** | **response** | `TUnPossessedAdminCamera` |
| **PLAYER_WARNED**            | **response** | `TPlayerWarned`           |
| **PLAYER_KICKED**            | **response** | `TPlayerKicked`           |
| **SQUAD_CREATED**            | **response** | `TSquadCreated`           |
| **PLAYER_BANNED**            | **response** | `TPlayerBanned`           |
| **data**                     | **response** | `TRconResponse`           |
| **err**                      | **error**    | `Error`                   |
| **connected**                |              |                           |
| **close**                    |              |                           |
