import { injectable } from "inversify";
import { IUser, User } from "../../models/user";
import { GenericRepository } from "./generics/generic_repository";

@injectable()
export class UserRepository extends GenericRepository<IUser> {

    public constructor() {
        super(User);
    }

    public async existsByUserId(userId: string): Promise<boolean> {
        return this.existsByQuery({userId: userId});
    }

    public async findByUserId(userId: string): Promise<IUser> {
        return this.findByQuery({userId: userId});
    }
}