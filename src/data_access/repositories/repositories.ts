import { Template } from "../../models/templates/template";

export type Query<IEntity> = {
    [P in keyof IEntity]?: IEntity[P] | {$regex: RegExp};
}

export interface Repository<IEntity extends Template> {
    update(entity: IEntity): Promise<boolean>;
    save(entity: IEntity): Promise<boolean>;
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