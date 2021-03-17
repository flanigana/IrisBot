import { Document } from "mongoose";
import { DataModel } from "./data_model";

export interface GuildTemplate extends DataModel {
    guildId: string,
    name: string
}

export interface GuildTemplateDoc extends Document {
    guildId: string,
    name: string
}