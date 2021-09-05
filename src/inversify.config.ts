import 'reflect-metadata';
import { Container, interfaces } from 'inversify';
import { TYPES } from './types';
import { Client } from 'discord.js';
import { Bot } from './bot';
import { GuildService } from './services/guild_service';
import { GuildRepository } from './data_access/repositories/guild_repository';
import { RaidTemplateService } from './services/raid_template_service';
import { MessageController } from './controllers/message_controller';
import { InteractiveSetup, SetupType } from './setup_service/generics/interactive_setup';
import { DataModel } from './models/interfaces/data_model';
import { ClientTools } from './utils/client_tools';
import { IRaidTemplate } from './models/raid_template';
import { RaidController } from './controllers/raid_controller';
import { RaidTemplateController } from './controllers/template_controllers/raid_template_controller';
import { RaidManager } from './raid_manager/raid_manager';
import { GuildConfigSetup } from './setup_service/guild_config_setup';
import { IGuild } from './models/guild';
import { ConfigController } from './controllers/config_controller';
import { RaidConfigRepository } from './data_access/repositories/raid_config_repository';
import { RaidConfigSetup } from './setup_service/raid_config_setup';
import { IRaidConfig } from './models/raid_config';
import { RaidTemplateRepository } from './data_access/repositories/raid_template_repository';
import { VerificationTemplateRepository } from './data_access/repositories/verification_template_repository';
import { VerificationTemplateService } from './services/verification_template_service';
import { VerificationTemplateSetup } from './setup_service/verification_template_setup';
import { IVerificationTemplate } from './models/verification_template';
import { VerificationTemplateController } from './controllers/template_controllers/verification_template_controller';
import { UserRepository } from './data_access/repositories/user_repository';
import { VericodeRepository } from './data_access/repositories/vericode_repository';
import { VerificationRepository } from './data_access/repositories/verification_repository';
import { UserService } from './services/user_service';
import { VerificationService } from './services/verification_service';
import { VerificationController } from './controllers/verification_controller';
import { VerificationManager } from './verification/verification_manager';
import { VerificationMessenger } from './verification/verification_messenger';
import { VericodeService } from './services/vericode_service';
import { RenderService } from './services/render_service';
import { RenderRepository } from './data_access/repositories/render_repository';
import { Realmeye } from './realmeye/realmeye';
import { RealmeyeDataService } from './realmeye/realmeye_data/realmeye_data_service';
import { RealmeyeRenderService } from './realmeye/realmeye_render/realmeye_render_service';
import { RealmEyeController } from './controllers/realmeye_controller';
import { RealmEyeManager } from './realmeye/realmeye_manager';
import { RaidTemplateSetup } from './setup_service/raid_template_setup';
import { GuildMessageCommand } from './command/message_command';
import { fluentProvide } from 'inversify-binding-decorators';
import { CoreCommandCenter } from './command/core_command_center';
import { CommandParameters, RootCommandCenter } from './command/interfaces/root_command_center';
import { HelpCommandCenter } from './command/help_command_center';
import { ConfigCommandCenter } from './command/config/config_command_center';
import { RaidConfigCommandCenter } from './command/config/config_raid_command';

const container = new Container();

const asSingleton = (identifier: any) => {
	return fluentProvide(identifier).inSingletonScope().done();
};

// client
container.bind<string>(TYPES.DiscordToken).toConstantValue(process.env.DISCORD_TOKEN);
container.bind<Client>(TYPES.Client).toConstantValue(
	new Client({
		intents: [
			'GUILDS',
			'GUILD_MESSAGES',
			'GUILD_MESSAGE_REACTIONS',
			'GUILD_EMOJIS_AND_STICKERS',
			'DIRECT_MESSAGES',
			'DIRECT_MESSAGE_REACTIONS',
		],
	})
);

// repositories
container.bind<GuildRepository>(TYPES.GuildRepository).to(GuildRepository).inSingletonScope();
container.bind<RaidTemplateRepository>(TYPES.RaidTemplateRepository).to(RaidTemplateRepository).inSingletonScope();
container.bind<RaidConfigRepository>(TYPES.RaidConfigRepository).to(RaidConfigRepository).inSingletonScope();
container
	.bind<VerificationTemplateRepository>(TYPES.VerificationTemplateRepository)
	.to(VerificationTemplateRepository)
	.inSingletonScope();
container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository).inSingletonScope();
container.bind<VericodeRepository>(TYPES.VericodeRepository).to(VericodeRepository).inSingletonScope();
container.bind<VerificationRepository>(TYPES.VerificationRepository).to(VerificationRepository).inSingletonScope();
container.bind<RenderRepository>(TYPES.RenderRepository).to(RenderRepository).inSingletonScope();

// services
container.bind<GuildService>(TYPES.GuildService).to(GuildService).inSingletonScope();
container.bind<RaidTemplateService>(TYPES.RaidTemplateService).to(RaidTemplateService).inSingletonScope();
container.bind<MessageController>(TYPES.MessageDispatcher).to(MessageController).inSingletonScope();
container.bind<VerificationManager>(TYPES.VerificationManager).to(VerificationManager).inSingletonScope();
container.bind<RaidManager>(TYPES.RaidManager).to(RaidManager).inSingletonScope();
container
	.bind<VerificationTemplateService>(TYPES.VerificationTemplateService)
	.to(VerificationTemplateService)
	.inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<VerificationService>(TYPES.VerificationService).to(VerificationService).inSingletonScope();
container.bind<VericodeService>(TYPES.VericodeService).to(VericodeService).inSingletonScope();
container.bind<RenderService>(TYPES.RenderService).to(RenderService).inSingletonScope();
container.bind<Realmeye>(TYPES.RealmEyeService).to(Realmeye).inSingletonScope();
container.bind<RealmeyeDataService>(TYPES.RealmEyeDataService).to(RealmeyeDataService).inSingletonScope();
container.bind<RealmeyeRenderService>(TYPES.RealmEyeRenderService).to(RealmeyeRenderService).inSingletonScope();
container.bind<RealmEyeManager>(TYPES.RealmEyeManager).to(RealmEyeManager).inSingletonScope();

// utilities
container.bind<ClientTools>(TYPES.ClientTools).to(ClientTools).inSingletonScope();
container.bind<VerificationMessenger>(TYPES.VerificationMessenger).to(VerificationMessenger).inSingletonScope();

// controllers
container.bind<ConfigController>(TYPES.ConfigController).to(ConfigController).inSingletonScope();
container.bind<VerificationController>(TYPES.VerificationController).to(VerificationController).inSingletonScope();
container.bind<RaidController>(TYPES.RaidController).to(RaidController).inSingletonScope();
container
	.bind<VerificationTemplateController>(TYPES.VerificationTemplateController)
	.to(VerificationTemplateController)
	.inSingletonScope();
container.bind<RaidTemplateController>(TYPES.RaidTemplateController).to(RaidTemplateController).inSingletonScope();
container.bind<RealmEyeController>(TYPES.RealmEyeController).to(RealmEyeController).inSingletonScope();

// factories
container
	.bind<interfaces.Factory<InteractiveSetup<DataModel>>>(TYPES.SetupService)
	.toFactory<InteractiveSetup<DataModel>>(() => {
		return (
			type: SetupType,
			command: GuildMessageCommand<RootCommandCenter, CommandParameters<RootCommandCenter>>,
			template?: DataModel
		) => {
			const bot = container.get<Bot>(TYPES.Bot);
			const clientTools = container.get<ClientTools>(TYPES.ClientTools);
			const guildService = container.get<GuildService>(TYPES.GuildService);
			let templateService;
			switch (type) {
				case SetupType.RaidTemplate:
					templateService = container.get<RaidTemplateService>(TYPES.RaidTemplateService);
					if (template) {
						return new RaidTemplateSetup(
							bot,
							clientTools,
							templateService,
							command,
							template as IRaidTemplate,
							true
						);
					} else {
						return new RaidTemplateSetup(bot, clientTools, templateService, command);
					}
				case SetupType.VerificationTemplate:
					templateService = container.get<VerificationTemplateService>(TYPES.VerificationTemplateService);
					if (template) {
						return new VerificationTemplateSetup(
							bot,
							clientTools,
							templateService,
							command,
							template as IVerificationTemplate,
							true
						);
					} else {
						return new VerificationTemplateSetup(bot, clientTools, templateService, command);
					}
				case SetupType.GuildConfig:
					return new GuildConfigSetup(bot, clientTools, guildService, command, template as IGuild);
				case SetupType.RaidConfig:
					return new RaidConfigSetup(bot, clientTools, guildService, command, template as IRaidConfig);
			}
		};
	});

// commands
container.bind<CoreCommandCenter>(TYPES.CommandCenter).to(CoreCommandCenter).inSingletonScope();
container.bind<HelpCommandCenter>(TYPES.HelpCommandCenter).to(HelpCommandCenter).inSingletonScope();
container.bind<ConfigCommandCenter>(TYPES.ConfigCommandCenter).to(ConfigCommandCenter).inSingletonScope();
container.bind<RaidConfigCommandCenter>(TYPES.RaidConfigCommandCenter).to(RaidConfigCommandCenter).inSingletonScope();

// bot
container.bind<Bot>(TYPES.Bot).to(Bot).inSingletonScope();

export { container, asSingleton };
