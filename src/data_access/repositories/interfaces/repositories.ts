import { DataModel } from "../../../models/interfaces/data_model";

export type Query<IEntity extends DataModel> = {
    [P in keyof IEntity]?: IEntity[P] | {$regex: RegExp};
}

export interface Repository<IEntity extends DataModel> {
    update(entity: IEntity): Promise<IEntity>;
    save(entity: IEntity): Promise<IEntity>;
    existsById(id: string): Promise<boolean>;
    existsByQuery(query: Query<IEntity>): Promise<boolean>;
    findById(id: string): Promise<IEntity>;
    findByQuery(query: Query<IEntity>): Promise<IEntity>;
    findManyByQuery(query?: Query<IEntity>): Promise<IEntity[]>;
    findAll(): Promise<IEntity[]>;
    deleteById(id: string): Promise<boolean>;
    deleteByQuery(query: Query<IEntity>): Promise<boolean>;
    deleteManyByQuery(query: Query<IEntity>): Promise<number>;
}