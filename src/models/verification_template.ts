import * as mongoose from 'mongoose';
import { type } from 'node:os';
import { GuildTemplate, GuildTemplateDoc } from './interfaces/guild_template';

export interface IVerificationTemplate extends GuildTemplate {
    _id?: string;
    guildId: string;
    name: string;
    verificationChannel: string;
    logChannel: string;
    guildVerification: boolean;
    guildName: string;
    guildRoles: GuildRoles;
    verifiedRoles: string[];
    removeRoles: string[];
    fame: number;
    rank: number;
    requireHidden: boolean;
    dungeonRequirements: DungeonRequirements;
}

export type GuildRoles = {
    setRoles: boolean,
    founderRole: string,
    leaderRole: string,
    officerRole: string,
    memberRole: string,
    initiateRole: string
}

export type DungeonRequirements = {
    [key: string]: number;
}

export function dungeonRequirementsToStringArray(requirements: DungeonRequirements): string[] {
    const dungeons = [];
    for (const key in requirements) {
        const val = requirements[key];
        dungeons.push(`${key}: ${val}`);
    }
    return dungeons;
}

export interface VerificationTemplateDoc extends GuildTemplateDoc, IVerificationTemplate {
    _id?: string;
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
    guildVerification: {
        type: Boolean,
        required: true
    },
    guildName: {
        type: String
    },
    guildRoles: {
        setRoles: Boolean,
        founderRole: String,
        leaderRole: String,
        officerRole: String,
        memberRole: String,
        initiateRole: String,
        default: {
            setRoles: false
        }
    },
    verifiedRoles: {
        type: [String],
        required: true
    },
    removeRoles: {
        type: [String]
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
    requireHidden: {
        type: Boolean,
        required: true
    },
    dungeonRequirements: {
        type: Map,
        of: Number
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
        guildVerification: false,
        guildName: undefined,
        guildRoles: {
            setRoles: false,
            founderRole: undefined,
            leaderRole: undefined,
            officerRole: undefined,
            memberRole: undefined,
            initiateRole: undefined
        },
        verifiedRoles: [],
        removeRoles: [],
        fame: 0,
        rank: 0,
        requireHidden: false,
        dungeonRequirements: {}
    };

    return Object.assign(template, fields);
}