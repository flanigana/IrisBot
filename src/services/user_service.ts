import { User } from 'discord.js';
import { inject, injectable } from 'inversify';
import { UserRepository } from '../data_access/repositories/user_repository';
import { VericodeRepository } from '../data_access/repositories/vericode_repository';
import { getBlankUser, IUser } from '../models/user';
import { TYPES } from '../types';

@injectable()
export class UserService {
	private readonly _UserRepo: UserRepository;
	private readonly _VericodeRepo: VericodeRepository;

	public constructor(
		@inject(TYPES.UserRepository) userRepo: UserRepository,
		@inject(TYPES.VericodeRepository) vericodeRepo: VericodeRepository
	) {
		this._UserRepo = userRepo;
		this._VericodeRepo = vericodeRepo;
	}

	/**
	 * Updates the IGN in the GB for the given Discord User.
	 * If the User does not exist in the DB, it will be created.
	 * @param user User to update IGN for
	 * @param ign New IGN to update to
	 */
	public async updateIgn(user: User, ign: string): Promise<IUser> {
		const iUser = await this.safeFindUser(user);
		if (iUser.ign) {
			iUser.previousIgn = iUser.ign;
		}
		iUser.ign = ign;
		iUser.isVerified = true;
		return this._UserRepo.save(iUser);
	}

	/**
	 * Removes the given Discord Users's IGN in the DB
	 * @param user User to remove IGN for
	 */
	public async removeIgn(user: User): Promise<IUser> {
		if (!(await this.hasVerifiedIgn(user.id))) {
			return;
		}
		const iUser = await this._UserRepo.findByUserId(user.id);
		if (iUser.ign) {
			iUser.previousIgn = iUser.ign;
		}
		iUser.ign = undefined;
		return this._UserRepo.save(iUser);
	}

	/**
	 * Guarantees the return of a valid IUser associated with the given Discord User.
	 * If the User already exists in DB, return it.
	 * If the User does not exist already, create a new entry in DB and return it.
	 * @param user User to find IUser for
	 */
	public async safeFindUser(user: User): Promise<IUser> {
		if (await this._UserRepo.existsByUserId(user.id)) {
			return this._UserRepo.findByUserId(user.id);
		} else {
			let iUser = this.getDefaultUser(user);
			iUser = await this._UserRepo.save(iUser);
			return iUser;
		}
	}

	/**
	 * Returns a new IUser object with attributes associated with the given Discord User
	 * @param user User to retrieve information from
	 */
	private getDefaultUser(user: User): IUser {
		return getBlankUser({
			userId: user.id,
		});
	}

	/**
	 * Checks whether the given Discord User id has a IUser entry in the DB and whether or not
	 * they have a verified IGN.
	 * @param userId Discord User's id to check for verified IGN in DB
	 */
	public async hasVerifiedIgn(userId: string): Promise<boolean> {
		if (!(await this._UserRepo.existsByUserId(userId))) {
			return false;
		}
		return this._UserRepo.findByUserId(userId).then((user) => {
			return user.isVerified && user.ign != undefined;
		});
	}

	public async existsByUserId(userId: string): Promise<boolean> {
		return this._UserRepo.existsByUserId(userId);
	}

	public async findByUserId(userId: string): Promise<IUser> {
		return this._UserRepo.findByUserId(userId);
	}

	public async existsByIgn(ign: string): Promise<boolean> {
		return this._UserRepo.existsByIgn(ign);
	}

	public async findByIgn(ign: string): Promise<IUser> {
		return this._UserRepo.findByIgn(ign);
	}

	public async save(user: IUser): Promise<IUser> {
		return this._UserRepo.save(user);
	}
}
