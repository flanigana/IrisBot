import { injectable } from 'inversify';
import { IVerificationTemplate, VerificationTemplate } from '../../models/verification_template';
import { TemplateRepository } from './generics/template_repository';

@injectable()
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
