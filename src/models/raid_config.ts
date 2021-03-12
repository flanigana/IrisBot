import * as mongoose from 'mongoose';

export interface IRaidConfig {
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

const guildSchema = new mongoose.Schema({
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
        required: true
    },
    allowBooster: {
        type: Boolean,
        required: true
    }
});

const RaidConfig = mongoose.model<RaidConfigDoc>('RaidConfig', guildSchema);

export { RaidConfig }