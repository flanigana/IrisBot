export enum BotPermission {
	ADMIN,
	MOD,
	RAIDLEADER,
	ANY,
}

export type CommandName = RootCommandName | SubCommandName;

export enum RootCommandName {
	HELP = 'HELP',
	CONFIG = 'CONFIG',
	VERIFICATION = 'VERIFICATION',
	MANUALVERIFY = 'MANUALVERIFY',
	MANUALUNVERIFY = 'MANUALUNVERIFY',
	RAID = 'RAID',
	PLAYER = 'PLAYER',
	GUILD = 'GUILD',
	VERIFY = 'VERIFY',
	UPDATEIGN = 'UPDATEIGN',
}

export enum SubCommandName {
	GENERAL = 'GENERAL',
	RAID = 'RAID',
}
