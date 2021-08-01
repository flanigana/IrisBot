import { User } from "discord.js";
import { inject, injectable } from "inversify";
import { UserRepository } from "../data_access/repositories/user_repository";
import { VericodeRepository } from "../data_access/repositories/vericode_repository";
import { getBlankUser, IUser } from "../models/user";
import { TYPES } from "../types";

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

    public async updateIgn(user: User, ign: string): Promise<IUser> {
        let iUser = await this.safeFindUser(user);
        if (iUser.ign) {
            iUser.previousIgn = iUser.ign;
        }
        iUser.ign = ign;
        iUser.isVerified = true;
        return this._UserRepo.save(iUser);
    }

    public async removeIgn(user: User): Promise<IUser> {
        if (!(await this.hasVerifiedIgn(user.id))) {
            return;
        }
        let iUser = await this._UserRepo.findByUserId(user.id);
        if (iUser.ign) {
            iUser.previousIgn = iUser.ign;
        }
        iUser.ign = undefined;
        return this._UserRepo.save(iUser);
    }

    public async safeFindUser(user: User): Promise<IUser> {
        if (await this._UserRepo.existsByUserId(user.id)) {
            return this._UserRepo.findByUserId(user.id);
        } else {
            let iUser = this.getDefaultUser(user);
            iUser = await this._UserRepo.save(iUser);
            return iUser;
        }
    }

    private getDefaultUser(user: User): IUser {
        return getBlankUser({
            userId: user.id
        });
    }

    public async hasVerifiedIgn(userId: string): Promise<boolean> {
        if (!(await this._UserRepo.existsByUserId(userId))) {
            return false;
        }
        return this._UserRepo.findByUserId(userId).then(user => {
            return (user.isVerified && user.ign != undefined);
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