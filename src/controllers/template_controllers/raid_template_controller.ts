import { inject, injectable } from 'inversify';
import { TYPES } from '../../types';
import { SetupType } from '../../setup_service/generics/setup_service';
import { IRaidTemplate } from '../../models/raid_template';
import { RaidTemplateService } from '../../services/raid_template_service';
import { ClientTools } from '../../utilities/client_tools';
import { TemplateController } from './template_controller';

@injectable()
export class RaidTemplateController extends TemplateController<IRaidTemplate> {

    public constructor(
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.RaidTemplateService) raidTemplateService: RaidTemplateService
    ) {
        super(clientTools, raidTemplateService, SetupType.RaidTemplate);
    }

}