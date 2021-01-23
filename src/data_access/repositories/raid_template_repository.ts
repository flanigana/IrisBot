import { injectable } from 'inversify';
import { GenericRepository } from './generic_repository';
import { RaidTemplate, RaidTemplateDoc, IRaidTemplate } from '../../models/raid_template';

@injectable()
export class RaidTemplateRepository
    extends GenericRepository<IRaidTemplate, RaidTemplateDoc> {
    
    public constructor() {
        super(RaidTemplate);
    }
}