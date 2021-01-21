require('dotenv').config();
import container from '../inversify.config';
import { TYPES } from './types';
import { Mongoose } from 'mongoose';
import { getDatabaseClient } from './data_access/db_client';
import { Bot } from './bot';

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