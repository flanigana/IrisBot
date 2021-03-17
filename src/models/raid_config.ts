import * as mongoose from 'mongoose';
import { DataModel } from './interfaces/data_model';

export interface IRaidConfig extends DataModel {
    _id?: string;
    guildId: string;
    raidLeaders: string[];
    runTime: number;
    confirmationsChannel: string;
    allowBooster: boolean;
}

export interface RaidConfigDoc extends mongoose.Document {
    guildId: string;
    raidLeaders: string[];
    runTime: number;
    confirmationsChannel: string;
    allowBooster: boolean
}

const raidConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    raidLeaders: {
        type: [String],
        required: true
    },
    runTime: {
        type: String,
        required: true
    }, 
    confirmationsChannel: {
        type: String,
        required: false
    },
    allowBooster: {
        type: Boolean,
        required: true
    }
});

const RaidConfig = mongoose.model<RaidConfigDoc>('RaidConfig', raidConfigSchema);

export { RaidConfig }

export function getDefaultRaidConfig(fields?: Partial<IRaidConfig>) {
    const config:IRaidConfig = {
        guildId: undefined,
        raidLeaders: [],
        runTime: 300,
        confirmationsChannel: undefined,
        allowBooster: false
    };

    return Object.assign<IRaidConfig, Partial<IRaidConfig>>(config, fields);
}