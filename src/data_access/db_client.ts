import * as mongoose from 'mongoose';

export async function getDatabaseClient(dbHost: string, dbName: string) {
    return new Promise<mongoose.Mongoose>((resolve, reject) => {
        const connString = `mongodb://${dbHost}/${dbName}`;
        mongoose.connect(connString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        const db = mongoose.connection;
        db.on('error', (e: Error) => {
            console.error('Db conenction error: ', e);
            reject(e);
        });
        db.once('open', () => {
            console.log('Db conenction success: ', connString);
            resolve(mongoose);
        });
    });
}