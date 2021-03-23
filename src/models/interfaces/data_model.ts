import { ObjectId } from "mongoose";

export interface DataModel {
    _id?: ObjectId;
    guildId: string;
}