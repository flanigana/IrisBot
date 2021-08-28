import { injectable } from 'inversify';
import { IVericode, Vericode } from '../../models/vericode';
import { GenericRepository } from './generics/generic_repository';

@injectable()
export class VericodeRepository extends GenericRepository<IVericode> {
	public constructor() {
		super(Vericode);
	}

	public async existsByUserId(userId: string): Promise<boolean> {
		return this.existsByQuery({ userId: userId });
	}

	public async findByUserId(userId: string): Promise<IVericode> {
		return this.findByQuery({ userId: userId });
	}

	public async deleteByUserId(userId: string): Promise<boolean> {
		return this.deleteByQuery({ userId: userId });
	}
}
