import * as mongoose from 'mongoose';
import { GuildTemplate, GuildTemplateDoc } from './interfaces/guild_template';

export interface IRaidTemplate extends GuildTemplate {
    _id?: string;
    guildId: string;
    name: string;
    description: string;
    primaryReact: string;
    secondaryReacts: string[];
    secondaryReactLimits: number[];
    additionalReacts: string[];
}

export interface RaidTemplateDoc extends GuildTemplateDoc {
    guildId: string;
    name: string;
    description: string;
    primaryReact: string;
    secondaryReacts: string[];
    secondaryReactLimits: number[];
    additionalReacts: string[];
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
        type: String,
        required: true
    },
    secondaryReacts: {
        type: [String],
        required: true
    },
    secondaryReactLimits: {
        type: [Number],
        required: true,
        min: 0
    },
    additionalReacts: {
        type: [String],
        required: true
    }
});

const RaidTemplate = mongoose.model<RaidTemplateDoc>('RaidTemplate', raidTemplateSchema);

export { RaidTemplate }

export function getBlankRaidTemplate(fields?: Partial<IRaidTemplate>): IRaidTemplate {
    const template:IRaidTemplate = {
        guildId: undefined,
        name: undefined,
        description: undefined,
        primaryReact: undefined,
        secondaryReacts: [],
        secondaryReactLimits: [],
        additionalReacts: []
    };

    return Object.assign(template, fields);
}