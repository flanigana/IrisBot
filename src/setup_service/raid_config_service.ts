import { injectable } from "inversify";
import { IGuild } from "../models/guild";
import { SetupService } from "./setup_service";

@injectable()
export class RaidConfigService extends SetupService<IGuild> {
    
}