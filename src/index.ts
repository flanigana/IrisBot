require('dotenv').config();
import container from '../inversify.config';
import { TYPES } from './types';
import { Mongoose } from 'mongoose';
import { getDatabaseClient } from './data_access/db_client';
import { Bot } from './bot';
import { RealmEyeService } from './realmeye/realmeye_service';
import { argv } from 'node:process';
import { findBestMatch } from './utilities/string_matcher';

(async () => {
    const dbClient = await getDatabaseClient('localhost:27017', 'IrisBot');
    container.bind<Mongoose>(TYPES.Mongoose).toConstantValue(dbClient);

    let bot = container.get<Bot>(TYPES.Bot);
    bot.listen().then(() => {
        console.log('Logged in!');
    }).catch((error) => {
        console.error('Error loggin in: ', error);
    });

    process.on('SIGINT', async () => {
        bot.logout().then(() => {
            console.log('Logged out.');
        });
    })

})().catch(console.error);

// (async () => {
//     runTest();
// })().catch(console.error);

// async function runTest() {
//     const arg = process.argv.slice(2).join(' ');
//     const realmeye = new RealmEyeService();
//     // await new Promise(resolve => setTimeout(resolve, 2000));
//     // await realmeye.getRealmEyeUserData(arg || 'Japan');
//     console.log(await (await realmeye.getRealmEyeUserData(arg || 'Japan')).dungeonCompletions);
//     // await realmeye.getRealmEyeGuildData('Black Bullet');
//     // console.log((await realmeye.getRealmEyeGuildData(arg || 'Black Bullet')).topCharacters[24]);
//     // findBestMatch(arg || 'void', ['Cursed Library', 'The Void', 'Lost Halls', 'Manor of the Immortals', 'Tomb of the Ancients'], {includeScore: false});
// }