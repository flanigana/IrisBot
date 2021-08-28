import { Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { RealmEyeManager } from '../realmeye/realmeye_manager';
import { TYPES } from '../types';

@injectable()
export class RealmEyeController {
	private readonly _RealmEyeManager: RealmEyeManager;

	public constructor(@inject(TYPES.RealmEyeManager) realmeyeManager: RealmEyeManager) {
		this._RealmEyeManager = realmeyeManager;
	}

	public async handleMessage(message: Message, args: string[]): Promise<void> {
		const command = args[0].toUpperCase();

		switch (command) {
			case 'PLAYER':
			case 'GUILD':
				this._RealmEyeManager.handleMessage(message, args);
				break;
		}
	}
}
