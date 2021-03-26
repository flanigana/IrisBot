import * as mongoose from 'mongoose';
import { DataModel } from './interfaces/data_model'

export interface IUser extends DataModel {
    userId: string;
    ign: string;
}

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    ign: {
        type: String,
        required: true
    }
});

const User = mongoose.model('User', userSchema);

export { User }

export function getBlankUser(fields?: Partial<IUser>): IUser {
    const user: IUser = {
        userId: undefined,
        ign: undefined
    };

    return Object.assign(user, fields);
}