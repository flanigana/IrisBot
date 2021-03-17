import { injectable } from 'inversify';
import { GenericRepository } from './generics/generic_repository';
import { Guild, GuildDoc, IGuild } from '../../models/guild';

@injectable()
export class GuildRepository
    extends GenericRepository<IGuild, GuildDoc> {
    
    public constructor() {
        super(Guild);
    }
}