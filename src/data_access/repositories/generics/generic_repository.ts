import { Repository, Query } from '../interfaces/repositories';
import { Document, Model } from 'mongoose';
import { DataModel } from '../../../models/interfaces/data_model';
import { injectable, unmanaged } from 'inversify';

@injectable()
export abstract class GenericRepository<IEntity extends DataModel> implements Repository<IEntity> {

    protected readonly Model: Model<any>

    public constructor(
        @unmanaged() model: Model<any>
    ) {
        this.Model = model;
    }

    public async update(entity: IEntity): Promise<boolean> {
        return this.Model.updateOne({_id: entity._id}, entity, {upsert: true}).then(res => {
            if (res.ok !== 1) {
                return false;
            }
            return true;
        });
    }

    public async save(entity: IEntity): Promise<boolean> {
        if (entity._id) {
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
        return this.Model.find().lean<IEntity[]>();
    }

    public async findById(id: string): Promise<IEntity> {
        return this.Model.findById(id).lean<IEntity>();
    }

    public async findByQuery(query: Query<IEntity>): Promise<IEntity> {
        return this.Model.findOne(query as any).lean<IEntity>();
    }

    public async findManyByQuery(query: Query<IEntity>): Promise<IEntity[]> {
        return this.Model.find(query as any).lean<IEntity[]>();
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
}