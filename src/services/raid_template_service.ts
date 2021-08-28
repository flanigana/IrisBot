import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { TemplateService } from './generics/template_service';
import { IRaidTemplate } from '../models/raid_template';
import { RaidTemplateRepository } from '../data_access/repositories/raid_template_repository';

@injectable()
export class RaidTemplateService extends TemplateService<IRaidTemplate> {
	public constructor(@inject(TYPES.RaidTemplateRepository) raidTemplateRepo: RaidTemplateRepository) {
		super(raidTemplateRepo);
	}
}
