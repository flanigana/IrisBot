import * as mongoose from 'mongoose';

export interface IGuild {
    _id: string;
    name: string;
    owner: string;
    prefix: string;
}

interface GuildModelInterface extends mongoose.Model<any> {
    build(attr: IGuild): GuildDoc;
}

export interface GuildDoc extends mongoose.Document {
    _id: string;
    name: string;
    owner: string;
    prefix: string;
}

const guildSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true
    }, 
    prefix: {
        type: String,
        required: true
    }
});

guildSchema.statics.build = (attr: IGuild): GuildDoc => {
    return new Guild(attr);
}

const Guild = mongoose.model<GuildDoc, GuildModelInterface>('Guild', guildSchema);

export { Guild }