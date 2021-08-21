export type FailureReason = {
    failure: string,
    failureMessage?: string,
    expected?: any,
    actual?: any
};

export class Status<T> {

    private _finalized: boolean;
    private _status: 'pending' | 'failed' | 'passed';
    
    private _failureReasons: FailureReason[];
    private _passingObjects: T[];

    private constructor(status: 'pending' | 'failed' | 'passed', reasons?: {failureReasons?: FailureReason[], passingObjects?: T[]}) {
        this._finalized = false;
        this._status = status;
        this._failureReasons = reasons?.failureReasons
            ? reasons.failureReasons
            : [];
        this._passingObjects = reasons?.passingObjects
            ? reasons.passingObjects
            : [];
    }

    public static createPending<T>(): Status<T> {
        return new Status<T>('pending');
    }

    public static createFailed<T>(...failureReasons: FailureReason[]): Status<T> {
        return new Status<T>('failed', {failureReasons: failureReasons});
    }

    public static createPassed<T>(...passingObjects: T[]): Status<T> {
        return new Status<T>('passed', {passingObjects: passingObjects}).finalize();
    }

    get finalized(): boolean {
        return this._finalized;
    }

    get status(): 'pending' | 'failed' | 'passed' {
        return this._status;
    }

    get pending(): boolean {
        return this._status === 'pending';
    }

    get failed(): boolean {
        return this._status === 'failed';
    }

    get passed(): boolean {
        return this._status === 'passed';
    }

    get failureReasons(): FailureReason[] {
        return this._failureReasons;
    }

    get passingObjects(): T[] {
        return this._passingObjects;
    }

    public addFailureReason(...failureReason: FailureReason[]): void {
        if (this._finalized) {
            throw new Error('Illegal Status Modification: Attempting to modify a finalized Status object.');
        }
        if (!this.failed) {
            this._status = 'failed';
        }
        this._failureReasons.push(...failureReason);
    }

    public addPassingObject(...passingObject: T[]): void {
        if (this._finalized) {
            throw new Error('Illegal Status Modification: Attempting to modify a finalized Status object.');
        }
        this._passingObjects.push(...passingObject);
    }

    public finalize(): Status<T> {
        if (this.pending) {
            this._status = 'passed';
        }
        this._finalized = true;
        return this;
    }

    public merge(attempt: Status<T>): Status<T> {
        if (this._finalized) {
            throw new Error('Illegal Status Modification: Attempting to modify a finalized Status object.');
        }
        if (this.failed || attempt.failed) {
            this._status = 'failed';
            this.addFailureReason(...attempt.failureReasons);
        } else if (this.pending || attempt.pending) {
            this._status = 'pending';
        } else if (this.passed && attempt.passed) {
            this._status = 'passed';
        }
        return this;
    }

    public getFirstPassing(): T {
        return this._passingObjects.length > 0
            ? this._passingObjects[0]
            : undefined;
    }

    public getLastPassing(): T {
        return this._passingObjects.length > 0
            ? this._passingObjects[this._passingObjects.length-1]
            : undefined;
    }
}