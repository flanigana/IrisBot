import * as mongoose from 'mongoose';

export interface DocumentBuilder<IEntity, EntityDoc extends mongoose.Document> extends mongoose.Model<any> {
    build(entity: IEntity): EntityDoc;
}