export class BotCommand {}

export class InvalidCommandError extends Error {
	private readonly _Command: BotCommand;

	constructor(message: string, command?: BotCommand) {
		super(message);
		this._Command = command;
	}

	public get command() {
		return this._Command;
	}
}
