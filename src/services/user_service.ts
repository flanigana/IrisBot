import { inject, injectable } from "inversify";
import { UserRepository } from "../data_access/repositories/user_repository";
import { VericodeRepository } from "../data_access/repositories/vericode_repository";
import { TYPES } from "../types";

@injectable()
export class UserService {

    private readonly _UserRepo: UserRepository;
    private readonly _VericodeRepo: VericodeRepository;

    public constructor(
        @inject(TYPES.UserRepository) userRepo: UserRepository,
        @inject(TYPES.VericodeRepository) vericodeRepo: VericodeRepository
    ){
        this._UserRepo = userRepo;
        this._VericodeRepo = vericodeRepo;
    }
}