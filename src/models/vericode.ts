import * as mongoose from 'mongoose';
import { DataModel } from './interfaces/data_model'

export interface IVericode extends DataModel {
    userId: string;
}

const vericodeSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    }
}, {timestamps: {createdAt: true}});

const Vericode = mongoose.model('Vericode', vericodeSchema);

export { Vericode }

export function getBlankVericode(fields?: Partial<IVericode>): IVericode {
    const vericode: IVericode = {
        userId: undefined,
    };

    return Object.assign(vericode, fields);
}