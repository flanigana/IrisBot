import 'reflect-metadata';
import { Container }  from 'inversify';
import { TYPES } from './src/types';
import { Client } from 'discord.js';
import { Bot } from './src/bot';
import { GuildService } from './src/services/guild_service';
import { GuildRepository } from './src/data_access/repositories/guild_repository';
import { RaidTemplateRepository } from './src/data_access/repositories/raid_template_repository';
import { RaidTemplateService } from './src/services/raid_template_service';
import { MessageDispatcher } from './src/services/message_dispatcher';

let container = new Container();

container.bind<string>(TYPES.DiscordToken).toConstantValue(process.env.DISCORD_TOKEN);
container.bind<Client>(TYPES.Client).toConstantValue(new Client());

container.bind<GuildRepository>(TYPES.GuildRepository).to(GuildRepository).inSingletonScope();
container.bind<GuildService>(TYPES.GuildService).to(GuildService).inSingletonScope();

container.bind<RaidTemplateRepository>(TYPES.RaidTemplateRepository).to(RaidTemplateRepository).inSingletonScope();
container.bind<RaidTemplateService>(TYPES.RaidTemplateService).to(RaidTemplateService).inSingletonScope();

container.bind<MessageDispatcher>(TYPES.MessageDispatcher).to(MessageDispatcher).inSingletonScope();

container.bind<Bot>(TYPES.Bot).to(Bot).inSingletonScope();

export default container;