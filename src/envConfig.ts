import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  HOST: process.env.HOST as string,
  RCON_PORT: Number(process.env.RCON_PORT),
  RCON_PASSWORD: process.env.RCON_PASSWORD as string,
};
