type ErrorInfo = {
    status?: number,
    statusText?: string,
    url?: string
}

export class RealmEyeError extends Error {

    private readonly errorInfo: ErrorInfo;

    constructor(message: string, errorInfo?: ErrorInfo) {
        super(message);
        Object.setPrototypeOf(this, RealmEyeError.prototype);
        this.name = 'RealmEyeError';
        this.errorInfo = errorInfo;
    }

    public get status() {
        return this.errorInfo.status;
    }

    public get statusText() {
        return this.errorInfo.statusText;
    }

    public get url() {
        return this.errorInfo.url;
    }
}