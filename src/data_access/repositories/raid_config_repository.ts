import { injectable } from "inversify";
import { IRaidConfig, RaidConfig, RaidConfigDoc } from "../../models/raid_config";
import { GenericRepository } from "./generics/generic_repository";

@injectable()
export class RaidConfigRepository extends GenericRepository<IRaidConfig, RaidConfigDoc> {

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