import { Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { UserService } from '../services/user_service';
import { TYPES } from '../types';
import { MessageParser } from '../utils/message_parser';
import { Realmeye } from './realmeye';

@injectable()
export class RealmEyeManager {
	private readonly _UserService: UserService;

	public constructor(@inject(TYPES.UserService) userService: UserService) {
		this._UserService = userService;
	}

	public async handlePlayerCommand(message: Message, args: string[]): Promise<void> {
		let searchName: string;
		if (args.length < 2) {
			searchName = (await this._UserService.findByUserId(message.author.id)).ign;
		} else if (MessageParser.isUser(args[1])) {
			searchName = (await this._UserService.findByUserId(MessageParser.parseUserId(args[1]))).ign;
		} else {
			searchName = args[1];
		}

		if (!searchName) {
			// TODO: Send failure to find user message
			return;
		}

		Realmeye.playerVisualization(message, searchName);
	}

	public async handleGuildCommand(message: Message, args: string[]): Promise<void> {
		let searchName: string;
		if (args.length < 2) {
			searchName = await this.getRealmGuildNameFromUserId(message.author.id);
		} else if (MessageParser.isUser(args[1])) {
			searchName = await this.getRealmGuildNameFromUserId(args[1]);
		} else {
			searchName = args.slice(1).join(' ');
		}

		if (!searchName) {
			// TODO: Send failure to find guild message
			return;
		}

		Realmeye.guildVisualization(message, searchName);
	}

	public async getRealmGuildNameFromUserId(userId: string): Promise<string> {
		const ign = (await this._UserService.findByUserId(userId)).ign;
		if (!ign) {
			return undefined;
		}
		return (await Realmeye.getRealmEyePlayerData(ign)).guild;
	}

	public async handleMessage(message: Message, args: string[]): Promise<void> {
		const command = args[0].toUpperCase();

		switch (command) {
			case 'PLAYER':
				this.handlePlayerCommand(message, args);
				break;
			case 'GUILD':
				this.handleGuildCommand(message, args);
				break;
		}
	}
}
