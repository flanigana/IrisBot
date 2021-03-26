import { ObjectID } from 'mongodb';

export interface DataModel {
    _id?: ObjectID;
}

export interface GuildModel extends DataModel {
    guildId: string;
}

export interface GuildTemplate extends GuildModel {
    name: string
}