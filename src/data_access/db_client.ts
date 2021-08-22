import mongoose from 'mongoose';
import Logger from '../utilities/logging';

export async function getDatabaseClient(dbHost: string, dbName: string) {
    return new Promise<mongoose.Mongoose>((resolve, reject) => {
        const connString = `mongodb://${dbHost}/${dbName}`;
        mongoose.connect(connString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        const db = mongoose.connection;
        db.on('error', (e: Error) => {
            Logger.error('DB connection error!', {error: e});
            reject(e);
        });
        db.once('open', () => {
            Logger.info(`DB Connection Success! Connected to ${connString}`);
            resolve(mongoose);
        });
    });
}