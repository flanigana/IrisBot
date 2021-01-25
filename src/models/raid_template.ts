import * as mongoose from 'mongoose';
import { DocumentBuilder } from './DocumentBuilder';

export interface IRaidTemplate {
    _id?: string;
    guildId: string;
    name: string;
    desription: string;
    primaryReact: string;
    primaryReactMin: number;
    secondaryReacts: string[];
    secondaryReactLimits: number[];
}

export interface RaidTemplateDoc extends mongoose.Document {
    guildId: string;
    name: string;
    desription: string;
    primaryReact: string;
    primaryReactMin: number;
    secondaryReacts: string[];
    secondaryReactLimits: number[];
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
    primaryReactMin: {
        type: Number,
        required: true,
        min: 0
    },
    secondaryReacts: {
        type: [String],
        required: true
    },
    secondaryReactLimits: {
        type: [Number],
        required: true,
        min: 0
    }
});

interface RaidTemplateModelInterface extends DocumentBuilder<IRaidTemplate, RaidTemplateDoc> {
    build(attr: IRaidTemplate): RaidTemplateDoc;
}

raidTemplateSchema.statics.build = (attr: IRaidTemplate): RaidTemplateDoc => {
    return new RaidTemplate(attr);
}

const RaidTemplate = mongoose.model<RaidTemplateDoc, RaidTemplateModelInterface>('RaidTemplate', raidTemplateSchema);

export { RaidTemplate }