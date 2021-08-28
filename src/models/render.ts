import * as mongoose from 'mongoose';
import { RenderType } from '../realmeye/realmeye_render/realmeye_render_types';
import { DataModel } from './interfaces/data_model';

export interface IRender extends DataModel {
	name: string;
	ref: string;
	data: Buffer;
	renderType: RenderType;
}

const renderSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		ref: {
			type: String,
			required: true,
		},
		renderType: {
			type: Number,
			enum: RenderType,
			default: RenderType.OTHER,
			required: true,
		},
		data: {
			type: Buffer,
			required: true,
		},
	},
	{ timestamps: true }
);

const Render = mongoose.model('Render', renderSchema);

export { Render };
