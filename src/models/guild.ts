import * as mongoose from 'mongoose';

export interface IGuild {
    _id: string;
    name: string;
    owner: string;
    prefix: string;
    admins: string[];
    mods: string[];
}

export interface GuildDoc extends mongoose.Document {
    _id: string;
    name: string;
    owner: string;
    prefix: string;
    admins: string[];
    mods: string[];
}

const guildSchema = new mongoose.Schema({
    _id: {
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

const Guild = mongoose.model<GuildDoc>('Guild', guildSchema);

export { Guild }