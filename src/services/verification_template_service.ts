import { inject, injectable } from 'inversify';
import { VerificationTemplateRepository } from '../data_access/repositories/verification_template_repository';
import { IVerificationTemplate } from '../models/verification_template';
import { TYPES } from '../types';
import { TemplateService } from './generics/template_service';

@injectable()
export class VerificationTemplateService extends TemplateService<IVerificationTemplate> {
	private readonly _VerificationTemplateRepo: VerificationTemplateRepository;

	public constructor(
		@inject(TYPES.VerificationTemplateRepository) verificationTemplateRepo: VerificationTemplateRepository
	) {
		super(verificationTemplateRepo);
		this._VerificationTemplateRepo = verificationTemplateRepo;
	}

	public async existsByVerificationChannel(channel: string): Promise<boolean> {
		return this._VerificationTemplateRepo.existsByVerificationChannelId(channel);
	}

	public async findByVerificationChannel(channel: string): Promise<IVerificationTemplate> {
		return this._VerificationTemplateRepo.findByVerificationChannelId(channel);
	}
}
