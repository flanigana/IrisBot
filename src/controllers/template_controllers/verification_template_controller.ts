import { inject, injectable } from 'inversify';
import { TemplateController } from './template_controller';
import { IVerificationTemplate } from '../../models/verification_template';
import { VerificationTemplateService } from '../../services/verification_template_service';
import { SetupType } from '../../setup_service/generics/interactive_setup';
import { TYPES } from '../../types';
import { ClientTools } from '../../utils/client_tools';

@injectable()
export class VerificationTemplateController extends TemplateController<IVerificationTemplate> {
	public constructor(
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@inject(TYPES.VerificationTemplateService) verificationTemplateService: VerificationTemplateService
	) {
		super(clientTools, verificationTemplateService, SetupType.VerificationTemplate);
	}
}
