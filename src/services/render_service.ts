import { inject, injectable } from 'inversify';
import { RenderRepository } from '../data_access/repositories/render_repository';
import { IRender } from '../models/render';
import { TYPES } from '../types';

@injectable()
export class RenderService {
	private readonly _RenderRepo: RenderRepository;

	public constructor(@inject(TYPES.RenderRepository) renderRepo: RenderRepository) {
		this._RenderRepo = renderRepo;
	}

	public async existsByName(name: string): Promise<boolean> {
		return this._RenderRepo.existsByName(name);
	}

	public async findByName(name: string): Promise<IRender> {
		return this._RenderRepo.findByName(name);
	}

	public async existsByRef(ref: string): Promise<boolean> {
		return this._RenderRepo.existsByRef(ref);
	}

	public async findByRef(ref: string): Promise<IRender> {
		return this._RenderRepo.findByRef(ref);
	}

	public async save(render: IRender): Promise<IRender> {
		return this._RenderRepo.save(render);
	}

	public async saveAll(renders: IRender[]): Promise<number> {
		return this._RenderRepo.saveAll(renders);
	}
}
