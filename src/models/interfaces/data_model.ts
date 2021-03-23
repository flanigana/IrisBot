import { ObjectID } from 'mongodb';

export interface DataModel {
    _id?: ObjectID;
    guildId: string;
}

export interface GuildTemplate extends DataModel {
    name: string
}