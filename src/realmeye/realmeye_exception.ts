export class RealmEyeError extends Error {

    private readonly eStatus: number;
    private readonly eStatusText: string;

    constructor(message: string, status?: number, statusText?: string) {
        super(message);
        Object.setPrototypeOf(this, RealmEyeError.prototype);
        this.name = 'RealmEyeError';
        this.eStatus = status;
        this.eStatusText = statusText;
    }

    public get status() {
        return this.status;
    }

    public get statusText() {
        return this.eStatusText;
    }
}