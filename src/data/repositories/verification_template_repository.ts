import { fluentProvide } from 'inversify-binding-decorators';
import { IVerificationTemplate, VerificationTemplate } from '../../models/verification_template';
import { TemplateRepository } from './generics/template_repository';

@(fluentProvide(VerificationTemplateRepository).inSingletonScope().done())
export class VerificationTemplateRepository extends TemplateRepository<IVerificationTemplate> {
	public constructor() {
		super(VerificationTemplate);
	}

	public async existsByVerificationChannelId(channelId: string): Promise<boolean> {
		return this.existsByQuery({ verificationChannel: channelId });
	}

	public async findByVerificationChannelId(channelId: string): Promise<IVerificationTemplate> {
		return this.findByQuery({ verificationChannel: channelId });
	}
}
