import { ObjectID } from 'mongodb';
import * as mongoose from 'mongoose';
import { DataModel } from './interfaces/data_model'

export interface IVerification extends DataModel {
    templateId: ObjectID;
    userId: string;
    status: VerificationStatus;
}

export enum VerificationStatus {
    QUEUED = 'QUEUED',
    VERIFIED = 'VERIFIED',
    UNVERIFIED = 'UNVERIFIED',
    SUSPENDED = 'SUSPENDED',
    BANNED = 'BANNED'
}

const verificationSchema = new mongoose.Schema({
    templateId: {
        type: ObjectID,
        ref: 'VerificationTemplate',
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: VerificationStatus,
        required: true
    }
}, {timestamps: true});

const Verification = mongoose.model('Verification', verificationSchema);

export { Verification }