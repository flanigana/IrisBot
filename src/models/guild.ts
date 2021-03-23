import * as mongoose from 'mongoose';
import { DataModel } from './interfaces/data_model';

export interface IGuild extends DataModel {
    name: string;
    owner: string;
    prefix: string;
    admins: string[];
    mods: string[];
}

const guildSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true
    }, 
    prefix: {
        type: String,
        required: true
    },
    admins: {
        type: [String],
        required: true
    },
    mods: {
        type: [String],
        required: true
    }
});

const Guild = mongoose.model('Guild', guildSchema);

export { Guild }

export function getBlankGuild(fields?: Partial<IGuild>): IGuild {
    const guild: IGuild = {
        guildId: undefined,
        name: undefined,
        owner: undefined,
        prefix: '!',
        admins: [],
        mods: []
    };

    return Object.assign(guild, fields);
}