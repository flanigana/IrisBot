export type FailureReason = {
	failure: string;
	failureMessage?: string;
	expected?: any;
	actual?: any;
};

export class Status<T> {
	private _finalized: boolean;
	private _status: 'pending' | 'failed' | 'passed';

	private _failureReasons: FailureReason[];
	private _passingObjects: T[];

	private constructor(
		status: 'pending' | 'failed' | 'passed',
		reasons?: { failureReasons?: FailureReason[]; passingObjects?: T[] }
	) {
		this._finalized = false;
		this._status = status;
		this._failureReasons = reasons?.failureReasons ? reasons.failureReasons : [];
		this._passingObjects = reasons?.passingObjects ? reasons.passingObjects : [];
	}

	public static createPending<T>(): Status<T> {
		return new Status<T>('pending');
	}

	public static createFailed<T>(...failureReasons: FailureReason[]): Status<T> {
		return new Status<T>('failed', { failureReasons: failureReasons });
	}

	public static createPassed<T>(...passingObjects: T[]): Status<T> {
		return new Status<T>('passed', { passingObjects: passingObjects }).finalize();
	}

	get finalized(): boolean {
		return this._finalized;
	}

	get status(): 'pending' | 'failed' | 'passed' {
		return this._status;
	}

	get isPending(): boolean {
		return this._status === 'pending';
	}

	get isFailed(): boolean {
		return this._status === 'failed';
	}

	get isPassed(): boolean {
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
		if (!this.isFailed) {
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
		if (this.isPending) {
			this._status = 'passed';
		}
		this._finalized = true;
		return this;
	}

	public merge(attempt: Status<T>): Status<T> {
		if (!attempt) {
			this._status = 'failed';
			this.addFailureReason({
				failure: 'Undefined Merge',
				failureMessage: 'The attempted Status merge was undefined.',
			});
		}
		if (this._finalized) {
			throw new Error('Illegal Status Modification: Attempting to modify a finalized Status object.');
		}
		if (this.isFailed || attempt.isFailed) {
			this._status = 'failed';
			this.addFailureReason(...attempt.failureReasons);
		} else if (this.isPending || attempt.isPending) {
			this._status = 'pending';
		} else if (this.isPassed && attempt.isPassed) {
			this._status = 'passed';
		}
		return this;
	}

	public getFirstFailure(): FailureReason {
		return this._failureReasons.length > 0 ? this._failureReasons[0] : undefined;
	}

	public getLastFailure(): FailureReason {
		return this._failureReasons.length > 0 ? this._failureReasons[this.failureReasons.length - 1] : undefined;
	}

	public getFirstPassing(): T {
		return this._passingObjects.length > 0 ? this._passingObjects[0] : undefined;
	}

	public getLastPassing(): T {
		return this._passingObjects.length > 0 ? this._passingObjects[this._passingObjects.length - 1] : undefined;
	}
}
