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

There are two ways to use the library. This can be done with Promises or EventEmitter, and you can combine them.

### EventEmmiter

```typescript
import { Rcon, TRconResponse } from 'squad-rcon';

const { rconEmitter, execute } = Rcon({
  host: '127.0.0.1',
  port: 1111,
  password: 'qwerty',
});

rconEmitter.on('connected', () => {
  console.log('connect');
  execute('ListPlayers');
});

rconEmitter.on('data', (data: TRconResponse) => {
  console.log(data);
});
```

### Promise

```typescript
import { RconPromise } from 'squad-rcon';

(async () => {
  try {
    const { rconEmitter, execute } = await RconPromise({
      host: '127.0.0.1',
      port: 1111,
      password: 'qwerty',
    });

    const res = await execute('ListPlayers');
    console.log(res);
  } catch (e: unknown) {
    console.log(e);
  }
})();
```
