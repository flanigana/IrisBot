import { injectable } from 'inversify';
import { RateLimitRequestService } from '../utils/rate_limit_request_service';
import { Status } from '../utils/status';
import { RealmEyeError } from './realmeye_error';
import Logger from '../utils/logging';
import { AxiosResponse } from 'axios';

export type InitializationSettings = {
	autoRetry: boolean;
	waitSecondsBeforeFirstRetry: number;
	maxAttempts: number;
	increaseSecondsBetweenFails: number;
	maxWaitSeconds: number;
};

@injectable()
export abstract class RealmeyeService {
	static readonly _REALMEYE_REQUEST_HEADERS = { 'User-Agent': 'IrisBot RotMG Discord Bot' };

	static readonly _BASE_REALMEYE_URL = 'https://www.realmeye.com';
	static readonly _RequestService: RateLimitRequestService = new RateLimitRequestService(1, {
		headers: RealmeyeService._REALMEYE_REQUEST_HEADERS,
	});

	/**
	 * Attempts the given initialization function and will retry based on the settings given.
	 * If autoRetry=false, no retries will be attempted for initialization and it will only try once.
	 * Returns a passing Status if one of the initialization attempts passed, otherwise
	 * returns a failing Status with the FailureReasons from all failed attempts.
	 * @param initializationFunction function to use for initialization
	 * @param initializationSettings settings to use for initialization
	 */
	static async attemptInitialization(
		initializationFunction: (...args: any[]) => Promise<Status<unknown>>,
		{
			autoRetry = false,
			waitSecondsBeforeFirstRetry: waitSeconds = 300,
			maxAttempts = 10,
			increaseSecondsBetweenFails = 60,
			maxWaitSeconds = Number.MAX_VALUE,
		}: Partial<InitializationSettings>,
		...initializationFunctionArgs: any[]
	): Promise<Status<unknown>> {
		let status = Status.createPending();
		try {
			status.merge(await initializationFunction(...initializationFunctionArgs));
		} catch (error) {
			if (error instanceof RealmEyeError) {
				status.addFailureReason({
					failure: `Initialization Error: ${initializationFunction.name} [RealmEye]`,
					failureMessage: `${Date.now}: ${error.name}-${error.message}`,
				});
			} else {
				status.addFailureReason({
					failure: `Initialization Error: ${initializationFunction.name} [Other]`,
					failureMessage: `${error.name}-${error.message}`,
				});
			}
		}

		if (status.isFailed && autoRetry) {
			while (status.failureReasons.length < maxAttempts) {
				Logger.warn(
					`Failed initialization: ${initializationFunction.name} attempt #${
						status.failureReasons.length
					} -- ${status.getLastFailure().failure}: ${status.getLastFailure().failureMessage}\n` +
						`\tRetrying in ${waitSeconds} seconds...`
				);
				const retryStatus = await RealmeyeService.createInitializationInterval(
					initializationFunction,
					{ waitSecondsBeforeFirstRetry: waitSeconds },
					...initializationFunctionArgs
				);
				if (retryStatus.isPassed) {
					status = retryStatus;
					break;
				} else {
					status.merge(retryStatus);
					waitSeconds += increaseSecondsBetweenFails;
					waitSeconds = waitSeconds <= maxWaitSeconds ? waitSeconds : maxWaitSeconds;
				}
			}
			if (status.isFailed) {
				Logger.error(
					`Failed initialization: ${initializationFunction.name} and reached max attempts of ${maxAttempts}. No more initialization attempts will be made.`
				);
			}
		} else if (!status.isFailed) {
			Logger.info(`Successful initialization: ${initializationFunction.name}`);
		}

		return status.finalize();
	}

	/**
	 * Creates a single-run interval that will attempt the given initialization function after the
	 * defined wait time (defined in seconds).
	 * Returns the Status of the initialization attempt.
	 * @param initializationFunction function to use for initialization
	 * @param initializationSettings settings to use for initialization
	 */
	static async createInitializationInterval(
		initializationFunction: (...args: any[]) => Promise<Status<unknown>>,
		{ waitSecondsBeforeFirstRetry: waitSeconds = 300 }: Partial<InitializationSettings>,
		...initializationFunctionArgs: any[]
	): Promise<Status<unknown>> {
		return await new Promise((resolve) => {
			const interval = setInterval(async () => {
				clearInterval(interval);
				const retryStatus = await RealmeyeService.attemptInitialization(
					initializationFunction,
					{ autoRetry: false },
					...initializationFunctionArgs
				);
				resolve(retryStatus);
			}, waitSeconds * 1000);
		});
	}

	static async getRealmEyePage(url: string): Promise<AxiosResponse> {
		const res = await RealmeyeService._RequestService.get(url);
		if (res.status !== 200) {
			throw new RealmEyeError('Error accessing RealmEye while initializing dungeon list.', {
				url: url,
				status: res.status,
				statusText: res.statusText,
			});
		}
		return res;
	}
}
