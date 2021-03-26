import * as mongoose from 'mongoose';
import { GuildTemplate } from './interfaces/data_model';

export interface IRaidTemplate extends GuildTemplate {
    name: string;
    description: string;
    primaryReact: RaidReact;
    secondaryReacts: RaidReact[];
    additionalReacts: RaidReact[];
}

export type RaidReact = {
    react: string;
    limit?: number;
}

const raidTemplateSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    primaryReact: {
        type: {
            react: String
        },
        required: true
    },
    secondaryReacts: {
        type: [{
            react: String,
            limit: Number,
            _id: false
        }],
        required: true
    },
    additionalReacts: {
        type: [{
            react: String,
            _id: false
        }],
        required: true
    }
});

const RaidTemplate = mongoose.model('RaidTemplate', raidTemplateSchema);

export { RaidTemplate }

export function getBlankRaidTemplate(fields?: Partial<IRaidTemplate>): IRaidTemplate {
    const template:IRaidTemplate = {
        guildId: undefined,
        name: undefined,
        description: undefined,
        primaryReact: {
            react: undefined
        },
        secondaryReacts: [],
        additionalReacts: []
    };

    return Object.assign(template, fields);
}

export function raidReactsToStringArray(reacts: RaidReact[]): string[] {
    const arr = [];
    for (const react of reacts) {
        arr.push(`${react.react}: ${react.limit ? react.limit : 0}`);
    }
    return arr;
}