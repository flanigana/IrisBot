export class RealmEyeError extends Error {
	private readonly _ErrorInfo: RealmEyeErrorInfo;

	constructor(message: string, errorInfo?: RealmEyeErrorInfo) {
		super(message);
		Object.setPrototypeOf(this, RealmEyeError.prototype);
		this.name = 'RealmEyeError';
		this._ErrorInfo = errorInfo;
	}

	public get status(): number {
		return this._ErrorInfo.status;
	}

	public get statusText(): string {
		return this._ErrorInfo.statusText;
	}

	public get url(): string {
		return this._ErrorInfo.url;
	}
}

type RealmEyeErrorInfo = {
	status?: number;
	statusText?: string;
	url?: string;
};
