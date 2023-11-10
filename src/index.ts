import { ENV } from './envConfig';
import { Rcon } from './test';

const { rconEmitter, execute } = Rcon({
  host: ENV.HOST,
  port: ENV.RCON_PORT,
  password: ENV.RCON_PASSWORD,
});

rconEmitter.on('connected', async () => {
  console.log('connected');
  const t = await execute('ListSquads');

  console.log(t);
});

// rconEmitter.on('ListPlayers', (response) => {
//   console.log(response, response.length);
// });
