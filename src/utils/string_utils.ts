import Fuse from 'fuse.js';

export abstract class StringUtils {
	private static defaultOptions: Fuse.IFuseOptions<string> = {
		includeScore: true,
		threshold: 0.5,
	};

	public static findBestMatch(val: string, list: string[], options?: Fuse.IFuseOptions<string>): string {
		options = Object.assign({}, this.defaultOptions, options);
		const res = new Fuse(list, options).search(val);
		return res.length > 0 ? res[0].item : undefined;
	}

	public static equalsIgnoreCase(a: string, b: string): boolean {
		if (!a || !b) {
			return false;
		}
		return a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;
	}

	public static isEmpty(a: string): boolean {
		return a === undefined || a.length === 0;
	}
}
