import * as mongoose from 'mongoose';
import { GuildTemplate, GuildTemplateDoc } from './interfaces/guild_template';

export interface IVerificationTemplate extends GuildTemplate {
    _id?: string;
    guildId: string;
    name: string;
    verificationChannel: string;
    logChannel: string;
    verifiedRoles: string[];
    removeRoles: string[];
    fame: number;
    rank: number;
    dungeonRequirements: string[];
    requireHidden: boolean;
}

export interface VerificationTemplateDoc extends GuildTemplateDoc {
    _id?: string;
    guildId: string;
    name: string;
    verificationChannel: string;
    logChannel: string;
    verifiedRoles: string[];
    removeRoles: string[];
    fame: number;
    rank: number;
    dungeonRequirements: string[];
    requireHidden: boolean;
}

const verificationTemplateSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    verificationChannel: {
        type: String,
        required: true
    },
    logChannel: {
        type: String,
        required: true
    },
    verifiedRoles: {
        type: [String],
        required: true
    },
    removeRoles: {
        type: [String],
        required: true
    },
    fame: {
        type: Number,
        required: true,
        min: 0
    },
    rank: {
        type: Number,
        required: true,
        min: 0
    },
    dungeonRequirements: {
        type: [String],
        required: true
    },
    requireHidden: {
        type: Boolean,
        required: true
    }
});

const VerificationTemplate = mongoose.model<VerificationTemplateDoc>('VerificationTemplate', verificationTemplateSchema);

export { VerificationTemplate }

export function getBlankVerificationTemplate(fields?: Partial<IVerificationTemplate>): IVerificationTemplate {
    const template:IVerificationTemplate = {
        guildId: undefined,
        name: undefined,
        verificationChannel: undefined,
        logChannel: undefined,
        verifiedRoles: [],
        removeRoles: [],
        fame: 0,
        rank: 0,
        dungeonRequirements: [],
        requireHidden: false
    };

    return Object.assign<IVerificationTemplate, Partial<IVerificationTemplate>>(template, fields);
}