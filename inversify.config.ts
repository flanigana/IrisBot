import 'reflect-metadata';
import { Container, interfaces }  from 'inversify';
import { TYPES } from './src/types';
import { Client, Message } from 'discord.js';
import { Bot } from './src/bot';
import { GuildService } from './src/services/guild_service';
import { GuildRepository } from './src/data_access/repositories/guild_repository';
import { RaidTemplateRepository } from './src/data_access/repositories/raid_template_repository';
import { RaidTemplateService } from './src/services/raid_template_service';
import { MessageDispatcher } from './src/services/message_dispatcher';
import { SetupService } from './src/services/setup_service/setup_service';
import { SetupType } from './src/services/setup_service/setup_type';
import { Template } from './src/models/templates/template';
import { RaidTemplateManager } from './src/services/setup_service/raid_template_manger';
import { ClientTools } from './src/utilities/client_tools';
import { IRaidTemplate } from './src/models/templates/raid_template';
import { RaidController } from './src/controllers/raid_controller';
import { RaidTemplateController } from './src/controllers/raid_template_controller';
import { RaidManager } from './src/services/raid_manager';

let container = new Container();

container.bind<string>(TYPES.DiscordToken).toConstantValue(process.env.DISCORD_TOKEN);
container.bind<Client>(TYPES.Client).toConstantValue(new Client());

// repositories
container.bind<GuildRepository>(TYPES.GuildRepository).to(GuildRepository).inSingletonScope();
container.bind<RaidTemplateRepository>(TYPES.RaidTemplateRepository).to(RaidTemplateRepository).inSingletonScope();

// services
container.bind<GuildService>(TYPES.GuildService).to(GuildService).inSingletonScope();
container.bind<RaidTemplateService>(TYPES.RaidTemplateService).to(RaidTemplateService).inSingletonScope();
container.bind<MessageDispatcher>(TYPES.MessageDispatcher).to(MessageDispatcher).inSingletonScope();
container.bind<ClientTools>(TYPES.ClientTools).to(ClientTools).inSingletonScope();
container.bind<RaidManager>(TYPES.RaidManager).to(RaidManager).inSingletonScope();

// controllers
container.bind<RaidController>(TYPES.RaidController).to(RaidController).inSingletonScope();
container.bind<RaidTemplateController>(TYPES.RaidTemplateController).to(RaidTemplateController).inSingletonScope();

// factories
container.bind<interfaces.Factory<SetupService<Template>>>(TYPES.SetupService).toFactory<SetupService<Template>>(() => {
    return (type: SetupType, message: Message, template?: Template) => {
        const bot = container.get<Bot>(TYPES.Bot);
        const clientTools = container.get<ClientTools>(TYPES.ClientTools);
        switch (type) {
            case SetupType.RaidTemplate:
                const raidTemplateService = container.get<RaidTemplateService>(TYPES.RaidTemplateService);
                if (template) {
                    return new RaidTemplateManager(bot, clientTools, raidTemplateService, message, template as IRaidTemplate);
                } else {
                    return new RaidTemplateManager(bot, clientTools, raidTemplateService, message);
                }
        }
    }
});

container.bind<Bot>(TYPES.Bot).to(Bot).inSingletonScope();

export default container;