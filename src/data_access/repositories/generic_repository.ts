import { Repository, Query } from './repositories';
import { injectable, unmanaged } from 'inversify';
import { Document } from 'mongoose';
import { DocumentBuilder } from '../../models/DocumentBuilder';

@injectable()
export abstract class GenericRepository<IEntity, EntityDoc extends Document> implements Repository<IEntity> {

    protected readonly Model: DocumentBuilder<IEntity, EntityDoc>

    public constructor(
        @unmanaged() model: DocumentBuilder<IEntity, EntityDoc>
    ) {
        this.Model = model;
    }

    public async save(entity: IEntity): Promise<IEntity> {
        return this.Model.build(entity).save().then(res => {
            return this._readMapper(res);
        });
    }

    public async existsById(id: string): Promise<boolean> {
        return this.Model.exists({_id: id});
    }

    public async existsByQuery(query: Query<IEntity>): Promise<boolean> {
        return this.Model.exists(query);
    }

    public async findAll(): Promise<IEntity[]> {
        return this.Model.find().then(res => {
            return res.map((r) => this._readMapper(r));
        });
    }

    public async findById(id: string): Promise<IEntity> {
        return this.Model.findById(id).then(res => {
            if (res === null) {
                return null;
            } else {
                return this._readMapper(res);
            }
        });
    }

    public async findByQuery(query: Query<IEntity>): Promise<IEntity> {
        return this.Model.findOne(query as any).then(res => {
            return this._readMapper(res);
        });
    }

    public async findManyByQuery(query: Query<IEntity>): Promise<IEntity[]> {
        return this.Model.find(query as any).then(res => {
            return res.map((r) => this._readMapper(r));
        });
    }

    public async deleteById(id: string): Promise<boolean> {
        return this.Model.deleteOne({_id: id});
    }

    public async deleteByQuery(query: Query<IEntity>): Promise<boolean> {
        return this.Model.deleteOne(query as any).then((val) => {
            if (val > 0) {
                return true;
            }
            return false;
        });
    }

    public async deleteManyByQuery(query: Query<IEntity>): Promise<number> {
        return this.Model.deleteMany(query as any).then((val) => {return val});
    }

    private _readMapper(model: EntityDoc): IEntity {
        const obj: any = model.toJSON();
        return obj as IEntity;
    }
}