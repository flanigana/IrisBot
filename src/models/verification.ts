import { ObjectID } from 'mongodb';
import * as mongoose from 'mongoose';
import { GuildModel } from './interfaces/data_model';

export interface IVerification extends GuildModel {
	templateId: ObjectID;
	userId: string;
	status: VerificationStatus;
}

export enum VerificationStatus {
	UNATTEMPTED = 'UNATTEMPED',
	QUEUED = 'QUEUED',
	FAILED = 'FAILED',
	VERIFIED = 'VERIFIED',
	UNVERIFIED = 'UNVERIFIED',
	MANUALLY_VERIFIED = 'MANUALLY_VERIFIED',
	SUSPENDED = 'SUSPENDED',
	BANNED = 'BANNED',
}

const verificationSchema = new mongoose.Schema(
	{
		templateId: {
			type: ObjectID,
			ref: 'VerificationTemplate',
			required: true,
		},
		guildId: {
			type: String,
			required: true,
		},
		userId: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: VerificationStatus,
			required: true,
		},
	},
	{ timestamps: true }
);

const Verification = mongoose.model('Verification', verificationSchema);

export { Verification };

export function getBlankVerification(fields?: Partial<IVerification>): IVerification {
	const verification: IVerification = {
		templateId: undefined,
		guildId: undefined,
		userId: undefined,
		status: undefined,
	};

	return Object.assign(verification, fields);
}
