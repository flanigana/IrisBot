import Fuse from "fuse.js"

const defaultOptions: Fuse.IFuseOptions<string> = {
    includeScore: true,
    threshold: 0.5
}

export function findBestMatch(val: string, list: string[], options?: Fuse.IFuseOptions<string>): string {
    options = Object.assign({}, defaultOptions, options);
    const res = new Fuse(list, options).search(val);
    // console.log(res);
    return res.length > 0 ? res[0].item : undefined;
}