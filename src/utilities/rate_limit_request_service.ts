import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

type QRequest = {
    resolve: () => void;
}

export class RateLimitRequestService  {

    private readonly client: AxiosInstance;
    private msWait: number;

    private interval: NodeJS.Timeout;
    private queue: QRequest[];

    public constructor(secondsBetweenRequests: number, axiosRequestConfig?: AxiosRequestConfig) {
        this.client = axios.create(axiosRequestConfig);
        this.msWait = secondsBetweenRequests * 1000;
        this.queue = [];
    }

    /**
     * Pushes a get request to the queue and returns a Promise resolving to the response once the request is able to be sent
     * @param url url to send get request to
     * @param options specific axios options for the request
     * @returns a Promise that will resolve to the response
     */
    public get(url: string, options?: AxiosRequestConfig): Promise<AxiosResponse> {
        return new Promise((resolve) => {
            this.pushRequest(
                {
                    resolve: () => {
                        resolve(this.client.get(url, options));
                    }
                }
            );
        });
    }

    /**
     * Pushes a single request to the queue and starts the request interval if it is not running
     * @param request request to push to the queue
     */
    private pushRequest(request :QRequest): void {
        this.queue.push(request);
        if (!this.interval) {
            this.startRequestInterval();
        }
    }

    /**
     * Starts the request interval to begin handling reponses in the queue
     */
    private startRequestInterval(): void {
        this.handleRequest(this.queue.shift());
        this.interval = setInterval(() => {
            if (this.queue.length === 0) {
                clearInterval(this.interval);
                this.interval = undefined;
                return;
            }

            this.handleRequest(this.queue.shift());
        }, this.msWait);
    }

    /**
     * Resolves the given request--processing the actual request
     * @param request request to resolve
     */
    private handleRequest(request: QRequest): void {
        request.resolve();
    }
}