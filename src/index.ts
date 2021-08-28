/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
import container from './inversify.config';
import { TYPES } from './types';
import { Mongoose } from 'mongoose';
import { getDatabaseClient } from './data_access/db_client';
import { Bot } from './bot';
import Logger from './utils/logging';

if (process.platform === 'win32') {
	const rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.on('SIGINT', () => process.emit('SIGINT', 'SIGINT'));
}

(async () => {
	const dbClient = await getDatabaseClient('localhost:27017', 'IrisBot');
	container.bind<Mongoose>(TYPES.Mongoose).toConstantValue(dbClient);

	const bot = container.get<Bot>(TYPES.Bot);
	bot.listen()
		.then(() => {
			Logger.info('Successfully logged in!');
		})
		.catch((error) => {
			Logger.error('Error logging in!', { error: error });
		});

	process.on('SIGINT', async () => {
		bot.logout().then(() => {
			Logger.info('Logged out...');
			process.exit();
		});
	});
})().catch(console.error);

(async () => {
	runTest();
})().catch(console.error);

async function runTest() {
	// const arg = process.argv.slice(2).join(' ');
	// await new Promise(resolve => setTimeout(resolve, 5000));
	// await realmeye.getRealmEyeUserData(arg || 'Japan');
	// console.log(await RealmEyeService.getRealmEyeUserData(arg || 'Japan'));
	// await realmeye.getRealmEyeGuildData('Black Bullet');
	// console.log((await realmeye.getRealmEyeGuildData(arg || 'Black Bullet')).topCharacters[24]);
	// findBestMatch(arg || 'void', ['Cursed Library', 'The Void', 'Lost Halls', 'Manor of the Immortals', 'Tomb of the Ancients'], {includeScore: false});
}
