import { Repository } from './repositories';
import { injectable, unmanaged } from 'inversify';
import { Document, Model } from 'mongoose';

@injectable()
export abstract class GenericRepository<IEntity, EntityDoc extends Document> implements Repository<IEntity, EntityDoc> {

    protected readonly Model: Model<any>

    public constructor(
        @unmanaged() model: Model<any>
    ) {
        this.Model = model;
    }

    public async existsById(id: string): Promise<boolean> {
        return Model.exists({_id: id});
    }

    public async save(doc: EntityDoc): Promise<IEntity> {
        return doc.save().then(res => {
            return this._readMapper(res);
        });
    }

    public async findAll(): Promise<IEntity[]> {
        return Model.find().then(res => {
            return res.map((r) => this._readMapper(r));
        });
    }

    public async findById(id: string): Promise<IEntity> {
        return Model.findById(id).then(res => {
            if (res === null) {
                return null;
            } else {
                return this._readMapper(res);
            }
        });
    }

    private _readMapper(model: EntityDoc): IEntity {
        const obj: any = model.toJSON();
        return obj as IEntity;
    }
}