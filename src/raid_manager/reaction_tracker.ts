import { GuildMember } from "discord.js";
import { RaidReact } from "../models/raid_template";

export class ReactionTracker {

    private _react: string;
    private _limit: number;
    private readonly _Reactors: Set<GuildMember>;

    public constructor(react: RaidReact) {
        this._react = react.react;
        this._limit = react.limit ? react.limit : 0;
        this._Reactors = new Set<GuildMember>();
    }

    public get react(): string {
        return this._react;
    }

    public get reactors(): IterableIterator<GuildMember> {
        return this._Reactors.values();
    }

    public get atMaxSize(): boolean {
        if (!this._limit) {
            return false;
        } else {
            return this._Reactors.size >= this._limit;
        }
    }

    public addReactor(user: GuildMember): boolean {
        if (!this.atMaxSize) {
            this._Reactors.add(user);
            return true;
        } else {
            return false;
        }
    }

    public has(user: GuildMember): boolean {
        return this._Reactors.has(user);
    }
}