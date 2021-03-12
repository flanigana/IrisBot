import * as mongoose from 'mongoose';
import { Template } from './template';

export interface IRaidTemplate extends Template {
    _id?: string;
    guildId: string;
    name: string;
    description: string;
    primaryReact: string;
    secondaryReacts: string[];
    secondaryReactLimits: number[];
    additionalReacts: string[];
}
export interface RaidTemplateDoc extends mongoose.Document {
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
        required: true,
    }
});

const RaidTemplate = mongoose.model<RaidTemplateDoc>('RaidTemplate', raidTemplateSchema);

export { RaidTemplate }

export function getRaidTemplate(fields?: Partial<IRaidTemplate>): IRaidTemplate {
    let template = {
        guildId: undefined,
        name: undefined,
        description: undefined,
        primaryReact: undefined,
        secondaryReacts: [],
        secondaryReactLimits: [],
        additionalReacts: []
    };

    return Object.assign<IRaidTemplate, Partial<IRaidTemplate>>(template, fields);
}