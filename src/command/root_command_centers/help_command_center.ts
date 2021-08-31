import { MessageEmbed, TextBasedChannels } from 'discord.js';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../types';
import { ClientTools } from '../../utils/client_tools';
import { StringUtils } from '../../utils/string_utils';
import { MessageCommand } from '../message_command';
import { ConfigCommandCenter } from './config_command_center';
import { BotPermission, RootCommandName } from './interfaces/command_types';
import {
	RootCommandCenter,
	CommandParameters,
	CommandAttributes,
	MalformedCommandError,
} from './interfaces/root_command_center';

@injectable()
export class HelpCommandCenter extends RootCommandCenter {
	public static readonly MINIMUM_COMMAND_LENGTH = 1;
	public static readonly REQUIRED_SUB_COMMAND = false;
	public static readonly SUB_COMMANDS = Object.values(RootCommandName);
	public static readonly REQUIRED_PERMISSIONS = [BotPermission.ANY];

	private readonly _ClientTools: ClientTools;

	public constructor(@inject(TYPES.ClientTools) clientTools: ClientTools) {
		super();
		this._ClientTools = clientTools;
	}

	public get RootCommandName() {
		return HelpCommandCenter.ROOT_COMMAND_NAME;
	}

	public get RequiredPermissions() {
		return HelpCommandCenter.REQUIRED_PERMISSIONS;
	}

	public get clientTools() {
		return this._ClientTools;
	}

	// TODO:
	public parse(attr: CommandAttributes): MessageCommand<RootCommandCenter, HelpCommandParameters> {
		let helpCommand = HelpCommandCenter.help;
		const commandName = attr.args.length > 1 ? attr.args[1].toUpperCase() : 'HELP';
		switch (commandName) {
			case ConfigCommandCenter.ROOT_COMMAND_NAME:
				helpCommand = ConfigCommandCenter.help;
				break;
			default:
				helpCommand = HelpCommandCenter.help;
				break;
		}
		const params = new HelpCommandParameters(helpCommand, this._ClientTools.getStandardEmbed());
		return new MessageCommand(this, attr.user, attr.channel, params, HelpCommandCenter.sendHelp);
	}

	public static override help(embed: MessageEmbed): MessageEmbed {
		embed
			.setTitle('Iris Bot Help')
			.setDescription(
				'To get help with any command or subcommand, use the prefix appender `?`. For example, if the set prefix is `!`, ' +
					'you will want to use `!?` before any command to get help, such as `!?verification`. You can also add the command string after the `help` command, such as `!help verification`'
			);
		ClientTools.addFieldsToEmbed(
			embed,
			{ name: 'Available Root Commands', value: Object.values(RootCommandName), options: { separator: '\n' } },
			{
				name: 'Command Parameter Syntax',
				value:
					'`arg1|arg2`: *Or* - choose one of the arguments separated by |\n' +
					'`:arg`: *Variable* - input the choice of argument i.e. `:textChannel` will want the name of a text channel in your server\n' +
					'`?:arg`: *Optional* - argument is not required but can be used',
			}
		);
		return embed;
	}

	private static sendHelp(command: MessageCommand<HelpCommandCenter, HelpCommandParameters>): void {
		command.channel.send({ embeds: [command.parameters.embed] });
	}

	public static malformedCommandHelp(embed: MessageEmbed, error: MalformedCommandError): MessageEmbed {
		embed
			.setTitle('Malformed Command')
			.setDescription('The command you tried was malformed and could not be processed.');
		ClientTools.addFieldsToEmbed(
			embed,
			{ name: 'Command', value: `\`${error.command}\`` },
			{ name: 'Error Info', value: error.message },
			{
				name: 'For Command Help',
				value: `For more help using the \`${error.command}\` command, try using \`help ${error.command}\`.`,
			}
		);
		return embed;
	}

	public static closeCommandHelp(embed: MessageEmbed, attempted: string, closest: string[]): MessageEmbed {
		embed
			.setTitle(`Invalid Command: ${attempted}`)
			.setDescription('The command you tried was an invalid command. See below for the closest commands.');
		ClientTools.addFieldToEmbed(embed, 'Closest Matches', closest, { separator: '\n' });
		return embed;
	}

	public static findClosestCommands(attempted: string, commandList?: string[]): string[] {
		return StringUtils.findBestMatches(attempted, commandList ?? Object.values(RootCommandName), {
			threshold: 0.85,
		});
	}
}

export class HelpCommandParameters extends CommandParameters {
	private readonly _Embed;

	public constructor(helpCommand: (embed: MessageEmbed) => MessageEmbed, embed: MessageEmbed) {
		super();
		this._Embed = helpCommand(embed);
		if (helpCommand != HelpCommandCenter.help) {
			ClientTools.addFieldsToEmbed(this._Embed, RootCommandCenter.ALL_HELP_FIELD);
		}
	}

	public get embed() {
		return this._Embed;
	}
}
