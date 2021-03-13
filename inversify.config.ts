import 'reflect-metadata';
import { Container, interfaces }  from 'inversify';
import { TYPES } from './src/types';
import { Client, Message } from 'discord.js';
import { Bot } from './src/bot';
import { GuildService } from './src/services/guild_service';
import { GuildRepository } from './src/data_access/repositories/guild_repository';
import { RaidTemplateRepository } from './src/data_access/repositories/raid_template_repository';
import { RaidTemplateService } from './src/services/raid_template_service';
import { MessageDispatcher } from './src/general/message_dispatcher';
import { SetupService } from './src/setup_service/setup_service';
import { SetupType } from './src/setup_service/setup_type';
import { Template } from './src/models/templates/template';
import { RaidTemplateManagerService } from './src/setup_service/raid_template_manger_service';
import { ClientTools } from './src/utilities/client_tools';
import { IRaidTemplate } from './src/models/templates/raid_template';
import { RaidController } from './src/raid/raid_controller';
import { RaidTemplateController } from './src/raid/raid_template_controller';
import { RaidManager } from './src/raid/raid_manager/raid_manager';
import { GuildConfigManagerService } from './src/setup_service/guild_config_manager_service';
import { IGuild } from './src/models/guild';
import { ConfigController } from './src/general/config_controller';
import { RaidConfigRepository } from './src/data_access/repositories/raid_config_repository';
import { RaidConfigManagerService } from './src/setup_service/raid_config_manager_service';
import { IRaidConfig } from './src/models/raid_config';

let container = new Container();

container.bind<string>(TYPES.DiscordToken).toConstantValue(process.env.DISCORD_TOKEN);
container.bind<Client>(TYPES.Client).toConstantValue(new Client());

// repositories
container.bind<GuildRepository>(TYPES.GuildRepository).to(GuildRepository).inSingletonScope();
container.bind<RaidTemplateRepository>(TYPES.RaidTemplateRepository).to(RaidTemplateRepository).inSingletonScope();
container.bind<RaidConfigRepository>(TYPES.RaidConfigRepository).to(RaidConfigRepository).inSingletonScope();

// services
container.bind<GuildService>(TYPES.GuildService).to(GuildService).inSingletonScope();
container.bind<RaidTemplateService>(TYPES.RaidTemplateService).to(RaidTemplateService).inSingletonScope();
container.bind<MessageDispatcher>(TYPES.MessageDispatcher).to(MessageDispatcher).inSingletonScope();
container.bind<ClientTools>(TYPES.ClientTools).to(ClientTools).inSingletonScope();
container.bind<RaidManager>(TYPES.RaidManager).to(RaidManager).inSingletonScope();

// controllers
container.bind<RaidController>(TYPES.RaidController).to(RaidController).inSingletonScope();
container.bind<RaidTemplateController>(TYPES.RaidTemplateController).to(RaidTemplateController).inSingletonScope();
container.bind<ConfigController>(TYPES.ConfigController).to(ConfigController).inSingletonScope();

// factories
container.bind<interfaces.Factory<SetupService<Template>>>(TYPES.SetupService).toFactory<SetupService<Template>>(() => {
    return (type: SetupType, message: Message, template?: Template) => {
        const bot = container.get<Bot>(TYPES.Bot);
        const clientTools = container.get<ClientTools>(TYPES.ClientTools);
        const guildService = container.get<GuildService>(TYPES.GuildService);
        switch (type) {
            case SetupType.RaidTemplate:
                const raidTemplateService = container.get<RaidTemplateService>(TYPES.RaidTemplateService);
                if (template) {
                    return new RaidTemplateManagerService(bot, clientTools, raidTemplateService, message, template as IRaidTemplate, true);
                } else {
                    return new RaidTemplateManagerService(bot, clientTools, raidTemplateService, message);
                }
            case SetupType.GuildConfig:
                return new GuildConfigManagerService(bot, clientTools, guildService, message, template as IGuild);
            case SetupType.RaidConfig:
                return new RaidConfigManagerService(bot, clientTools, guildService, message, template as IRaidConfig);
        }
    }
});

container.bind<Bot>(TYPES.Bot).to(Bot).inSingletonScope();

export default container;