import { injectable } from "inversify";
import { getDefaultRaidConfig, IRaidConfig, RaidConfig } from "../../models/raid_config";
import { GenericRepository } from "./generics/generic_repository";

@injectable()
export class RaidConfigRepository extends GenericRepository<IRaidConfig> {

    public constructor() {
        super(RaidConfig);
    }

    public async existsByGuild(guildId: string): Promise<boolean> {
        return this.existsByQuery({guildId: guildId});
    }

    public async findByGuild(guildId: string): Promise<IRaidConfig> {
        return this.findByQuery({guildId: guildId});
    }
}