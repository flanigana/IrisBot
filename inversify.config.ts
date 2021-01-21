import 'reflect-metadata';
import { Container }  from 'inversify';
import { TYPES } from './src/types';
import { Client } from 'discord.js';
import { Bot } from './src/bot';
import { GuildService } from './src/services/guild_service';
import { GuildRepository } from './src/data_access/repositories/guild_repository';

let container = new Container();

container.bind<string>(TYPES.DiscordToken).toConstantValue(process.env.DISCORD_TOKEN);
container.bind<Client>(TYPES.Client).toConstantValue(new Client());

container.bind<GuildRepository>(TYPES.GuildRepository).to(GuildRepository).inSingletonScope();;
container.bind<GuildService>(TYPES.GuildService).to(GuildService).inSingletonScope();

container.bind<Bot>(TYPES.Bot).to(Bot).inSingletonScope();

export default container;