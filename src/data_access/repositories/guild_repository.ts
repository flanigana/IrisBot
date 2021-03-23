import { injectable } from 'inversify';
import { GenericRepository } from './generics/generic_repository';
import { Guild, IGuild } from '../../models/guild';

@injectable()
export class GuildRepository
    extends GenericRepository<IGuild> {
    
    public constructor() {
        super(Guild);
    }

    public async existsByGuild(guildId: string): Promise<boolean> {
        return this.existsByQuery({guildId: guildId});
    }

    public async findByGuild(guildId: string): Promise<IGuild> {
        return this.findByQuery({guildId: guildId});
    }
}