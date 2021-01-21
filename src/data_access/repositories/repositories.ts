export interface Repository<IEntity, EntityDoc> {
    save(doc: EntityDoc): Promise<IEntity>;
    findAll(): Promise<IEntity[]>;
    findById(id: string): Promise<IEntity>;
}