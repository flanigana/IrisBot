import { Repository, Query } from './repositories';
import { injectable, unmanaged } from 'inversify';
import { Document } from 'mongoose';
import { DocumentBuilder } from '../../models/document_builder';
import { Template } from '../../models/templates/template';

@injectable()
export abstract class GenericRepository<IEntity extends Template, EntityDoc extends Document> implements Repository<IEntity> {

    protected readonly Model: DocumentBuilder<IEntity, EntityDoc>

    public constructor(
        @unmanaged() model: DocumentBuilder<IEntity, EntityDoc>
    ) {
        this.Model = model;
    }

    public async update(entity: IEntity): Promise<boolean> {
        const id = entity._id;
        delete entity._id;
        return this.Model.updateOne({_id: id}, entity, {upsert: true}).then(res => {
            if (res.ok !== 1) {
                return false;
            }
            return true;
        });
    }

    public async save(entity: IEntity): Promise<boolean> {
        if (entity._id && entity._id !== '') {
            return this.update(entity);
        } else {
            return this.Model.create(entity).then(res => {
                if (!res) {
                    return false;
                }
                return true;
            });
        }
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
        return this.Model.deleteOne({_id: id}).then((res) => {
            if (res.deletedCount > 0) {
                return true;
            }
            return false;
        });
    }

    public async deleteByQuery(query: Query<IEntity>): Promise<boolean> {
        return this.Model.deleteOne(query as any).then((res) => {
            if (res.deletedCount > 0) {
                return true;
            }
            return false;
        });
    }

    public async deleteManyByQuery(query: Query<IEntity>): Promise<number> {
        return this.Model.deleteMany(query as any).then((res) => {return res.deletedCount});
    }

    private _readMapper(model: EntityDoc): IEntity {
        const obj: any = model.toJSON();
        return obj as IEntity;
    }
}