import * as mongoose from 'mongoose';
import { IVerificationTemplate, VerificationTemplateDoc } from './verification_template';

export interface IGuildVerificationTemplate extends IVerificationTemplate {
    founderRole: string;
    leaderRole: string;
    officerRole: string;
    memberRole: string;
    initiateRole: string;
}

export interface GuildVerificationTemplateDoc extends VerificationTemplateDoc {
    founderRole: string;
    leaderRole: string;
    officerRole: string;
    memberRole: string;
    initiateRole: string;
}

const guildVerificationTemplateSchema = new mongoose.Schema({
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
    founderRole: {
        type: String,
        required: true
    },
    leaderRole: {
        type: String,
        required: true
    },
    officerRole: {
        type: String,
        required: true
    },
    memberRole: {
        type: String,
        required: true
    },
    initiateRole: {
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

const GuildVerificationTemplate = mongoose.model<GuildVerificationTemplateDoc>('GuildVerificationTemplate', guildVerificationTemplateSchema);

export { GuildVerificationTemplate }

export function getBlankGuildVerificationTemplate(fields?: Partial<IGuildVerificationTemplate>): IGuildVerificationTemplate {
    const template:IGuildVerificationTemplate = {
        guildId: undefined,
        name: undefined,
        verificationChannel: undefined,
        logChannel: undefined,
        founderRole: undefined,
        leaderRole: undefined,
        officerRole: undefined,
        memberRole: undefined,
        initiateRole: undefined,
        verifiedRoles: [],
        removeRoles: [],
        fame: 0,
        rank: 0,
        dungeonRequirements: [],
        requireHidden: false
    };

    return Object.assign<IGuildVerificationTemplate, Partial<IGuildVerificationTemplate>>(template, fields);
}