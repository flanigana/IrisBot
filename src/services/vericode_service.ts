import { inject, injectable } from 'inversify';
import { VericodeRepository } from '../data_access/repositories/vericode_repository';
import { IVericode } from '../models/vericode';
import { TYPES } from '../types';

@injectable()
export class VericodeService {
	private readonly _VericodeRepo: VericodeRepository;

	public constructor(@inject(TYPES.VericodeRepository) vericodeRepo: VericodeRepository) {
		this._VericodeRepo = vericodeRepo;
	}

	public async existsByUserId(userId: string): Promise<boolean> {
		return this._VericodeRepo.existsByUserId(userId);
	}

	public async findByUserId(userId: string): Promise<IVericode> {
		return this._VericodeRepo.findByUserId(userId);
	}

	public async save(vericode: IVericode): Promise<IVericode> {
		return this._VericodeRepo.save(vericode);
	}

	public async deleteByUserId(userId: string): Promise<boolean> {
		return this._VericodeRepo.deleteByUserId(userId);
	}
}
