import { fluentProvide } from 'inversify-binding-decorators';
import { IUser, User } from '../../models/user';
import { GenericRepository } from './generics/generic_repository';

@(fluentProvide(UserRepository).inSingletonScope().done())
export class UserRepository extends GenericRepository<IUser> {
	public constructor() {
		super(User);
	}

	public async existsByUserId(userId: string): Promise<boolean> {
		return this.existsByQuery({ userId: userId });
	}

	public async findByUserId(userId: string): Promise<IUser> {
		return this.findByQuery({ userId: userId });
	}

	public async existsByIgn(ign: string): Promise<boolean> {
		return this.existsByQuery({ ign: { $regex: new RegExp(`^${ign}$`, 'i') } });
	}

	public async findByIgn(ign: string): Promise<IUser> {
		return this.findByQuery({ ign: { $regex: new RegExp(`^${ign}$`, 'i') } });
	}
}
