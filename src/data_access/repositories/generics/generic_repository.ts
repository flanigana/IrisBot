import { Repository, Query } from '../interfaces/repositories';
import { Model } from 'mongoose';
import { DataModel } from '../../../models/interfaces/data_model';
import { injectable, unmanaged } from 'inversify';
import { ObjectID } from 'mongodb';

@injectable()
export abstract class GenericRepository<IEntity extends DataModel> implements Repository<IEntity> {

    protected readonly Model: Model<any>

    public constructor(
        @unmanaged() model: Model<any>
    ) {
        this.Model = model;
    }

    public async update(entity: IEntity): Promise<IEntity> {
        return this.Model.updateOne({_id: entity._id}, entity, {upsert: true}).lean<IEntity>();
    }

    public async save(entity: IEntity): Promise<IEntity> {
        if (entity._id) {
            return this.update(entity);
        } else {
            return this.Model.create(entity);
        }
    }

    public async existsById(id: string | ObjectID): Promise<boolean> {
        return this.Model.exists({_id: id});
    }

    public async existsByQuery(query: Query<IEntity>): Promise<boolean> {
        return this.Model.exists(query);
    }

    public async findAll(): Promise<IEntity[]> {
        return this.Model.find().lean<IEntity[]>();
    }

    public async findById(id: string | ObjectID): Promise<IEntity> {
        return this.Model.findById(id).lean<IEntity>();
    }

    public async findByQuery(query: Query<IEntity>): Promise<IEntity> {
        return this.Model.findOne(query as any).lean<IEntity>();
    }

    public async findManyByQuery(query: Query<IEntity>): Promise<IEntity[]> {
        return this.Model.find(query as any).lean<IEntity[]>();
    }

    public async deleteById(id: string | ObjectID): Promise<boolean> {
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
}