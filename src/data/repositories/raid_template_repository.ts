import { fluentProvide } from 'inversify-binding-decorators';
import { IRaidTemplate, RaidTemplate } from '../../models/raid_template';
import { TemplateRepository } from './generics/template_repository';

@(fluentProvide(RaidTemplateRepository).inSingletonScope().done())
export class RaidTemplateRepository extends TemplateRepository<IRaidTemplate> {
	public constructor() {
		super(RaidTemplate);
	}
}
