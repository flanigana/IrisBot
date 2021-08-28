import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { Status } from '../utils/status';
import { RealmeyeDataService } from './realmeye_data/realmeye_data_service';
import { ClassData, RealmEyeGuildData, RealmEyePlayerData } from './realmeye_data/realmeye_data_types';
import { RealmeyeRenderService } from './realmeye_render/realmeye_render_service';
import { InitializationSettings } from './realmeye_service';
import Logger from '../utils/logging';
import { Message } from 'discord.js';
import { ClientTools } from '../utils/client_tools';
import { ImgurService } from '../utils/imgur_service';

@injectable()
export class Realmeye {
	private static _ready: boolean;

	private static _dataService: RealmeyeDataService;
	private static _renderService: RealmeyeRenderService;

	private static _clientTools: ClientTools;

	// Both services need to be injected (somewhere) so they get initialized as part of inversify.js
	public constructor(
		@inject(TYPES.RealmEyeDataService) dataService: RealmeyeDataService,
		@inject(TYPES.RealmEyeRenderService) renderService: RealmeyeRenderService,
		@inject(TYPES.ClientTools) clientTools: ClientTools
	) {
		this.dataService = dataService;
		this.renderService = renderService;
		Realmeye._clientTools = clientTools;
		Realmeye.initialize({
			autoRetry: true,
			waitSecondsBeforeFirstRetry: 30,
			maxAttempts: 10,
			increaseSecondsBetweenFails: 30,
			maxWaitSeconds: 1800,
		});
	}

	public static get ready(): boolean {
		return Realmeye._ready;
	}

	public static get dungeonList(): Set<string> {
		return RealmeyeDataService.dungeonList;
	}

	public static get classList(): ClassData {
		return RealmeyeDataService.classData;
	}

	private set dataService(dataService: RealmeyeDataService) {
		if (Realmeye._dataService) {
			return;
		}
		Realmeye._dataService = dataService;
	}

	private set renderService(renderService: RealmeyeRenderService) {
		if (Realmeye._renderService) {
			return;
		}
		Realmeye._renderService = renderService;
	}

	/**
	 * Attempts to fully initialize `RealmEye`.
	 * Will retry failed initializations if autoRetry=true up to the given maxAttempt count
	 * @param initializationSettings settings to use for initialization
	 */
	public static async initialize(initializationSettings: Partial<InitializationSettings>): Promise<void> {
		const status = Status.createPending();
		const startTime = Date.now();

		try {
			await RealmeyeDataService.initialize(initializationSettings)
				.then((s) => {
					status.merge(s);
				})
				.then(async () => {
					return RealmeyeRenderService.initialize(initializationSettings);
				});
		} catch (error) {
			Logger.error('Unexpected error during RealmEye initialization', { error: error });
		}

		if (status.isFailed) {
			Logger.error('One or more RealmEye initializations have failed!');
		} else {
			Logger.info(`RealmEye successfully initialized in ${(Date.now() - startTime) / 1000} seconds!`);
		}

		Realmeye._ready = true;
		status.finalize();
	}

	public static async getRealmEyePlayerData(ign: string): Promise<RealmEyePlayerData> {
		return RealmeyeDataService.getRealmEyePlayerData(ign);
	}

	public static async getRealmEyeGuildData(guildName: string): Promise<RealmEyeGuildData> {
		return RealmeyeDataService.getRealmEyeGuildData(guildName);
	}

	public static async playerVisualization(message: Message, ign: string): Promise<void> {
		const playerData = await RealmeyeDataService.getRealmEyePlayerData(ign);
		let charactersBuffer: Promise<Buffer>;
		if (playerData.characters) {
			charactersBuffer = RealmeyeRenderService.playerVisualizationImage(playerData);
		}

		const starEmoji = Realmeye._clientTools.getEmoji(`${playerData.star.replace(/\-/g, '')}star`);
		const fameEmoji = Realmeye._clientTools.getEmoji('fameicon');
		const guildRankEmoji = Realmeye._clientTools.getEmoji(`${playerData.guildRank?.toLowerCase()}rank`);
		const embed = Realmeye._clientTools
			.getStandardEmbed()
			.setTitle(`${playerData.name}'s RealmEye`)
			.setURL(playerData.realmEyeUrl)
			.setDescription(playerData.description ?? 'No description');
		Realmeye._clientTools.addFieldsToEmbed(
			embed,
			{ name: 'User', value: playerData.name, options: { inline: true } },
			{ name: 'Characters', value: playerData.characterCount, options: { inline: true, default: 'Hidden' } },
			{
				name: 'Guild',
				value: `[${playerData.guild ?? ''}](${playerData.realmEyeGuildUrl ?? ''})`,
				options: { inline: true, default: '-----' },
			},
			{ name: 'Rank', value: `${starEmoji ?? ''}${playerData.rank}`, options: { inline: true } },
			{
				name: 'Alive Fame',
				value: `${fameEmoji}${playerData.fame}`,
				options: { inline: true, default: 'Hidden' },
			},
			{
				name: 'Guild Rank',
				value: `${guildRankEmoji ?? ''}${playerData.guildRank ?? ''}`,
				options: { inline: true, default: '[]()' },
			}
		);

		await message.channel.send({ embeds: [embed] }).then(async (m: Message) => {
			if (!m.editable || !charactersBuffer || m.embeds.length === 0) {
				return;
			}
			await charactersBuffer.then(async (b: Buffer) => {
				const imageUrl = await ImgurService.upload(b);
				return embed.setImage(imageUrl);
			});
			m.edit({ embeds: [embed] });
		});
	}

	public static async guildVisualization(message: Message, guildName: string): Promise<void> {
		const guildData = await RealmeyeDataService.getRealmEyeGuildData(guildName);
		let charactersBuffer: Promise<Buffer>;
		if (guildData.topCharacters) {
			charactersBuffer = RealmeyeRenderService.guildVisualizationImage(guildData);
		}

		const embed = Realmeye._clientTools
			.getStandardEmbed()
			.setTitle(`${guildData.name}'s RealmEye`)
			.setURL(guildData.realmEyeUrl)
			.setDescription(guildData.description ?? 'No description');
		Realmeye._clientTools.addFieldsToEmbed(
			embed,
			{ name: 'Guild', value: guildData.name, options: { inline: true } },
			{ name: 'Fame', value: guildData.fame, options: { inline: true } },
			{ name: 'Server', value: guildData.server, options: { inline: true } },
			{ name: 'Characters', value: guildData.characterCount, options: { inline: true } },
			{ name: 'Fame Rank', value: guildData.fameRank, options: { inline: true } },
			{ name: 'Server Rank', value: guildData.serverRank, options: { inline: true } },
			{
				name: `Members: ${guildData.memberCount}`,
				value: guildData.members.map((m) => m.name),
				options: { separator: ', ' },
			}
		);

		await message.channel.send({ embeds: [embed] }).then(async (m: Message) => {
			if (!m.editable || !charactersBuffer || m.embeds.length === 0) {
				return;
			}
			await charactersBuffer.then(async (b: Buffer) => {
				const imageUrl = await ImgurService.upload(b);
				return embed.setImage(imageUrl);
			});
			m.edit({ embeds: [embed] });
		});
	}
}
