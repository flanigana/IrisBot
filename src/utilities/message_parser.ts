/**
 * Module used to parse a message into an array of normalized values
 */
export module MessageParser {
    /**
     * Returns an array of strings grouping arguments enclosed with quotes together as one argument
     * @param message message string to parse
     */
    export function parseMessage(message: string) {
        return message.match(/("[^"]+",?)|('[^']+',?)|(\S+)/g).map(arg => {return arg.replace(/^:|['"]|,$/g, '')});
    }

    /**
     * Returns a number from the given string. If any non-digit (and -) characters are included, returns 0;
     * otherwise, returns the number in the string.
     * @param message message string to parse number from
     */
    export function parseNumber(message: string) {
        const nonNumReg = new RegExp(/[^-\d]/);
        if (nonNumReg.test(message)) {
            return 0;
        }
        const num = parseInt(message);
        return Number.isNaN(num) ? 0 : num;
    }

    /**
     * Attempts to return the base user id from the given string.
     * If the string cannot be matched, returns undefined.
     * @param message user id to parse
     */
    export function parseUserId(message: string) {
        const matcher = message.match(/^<@!(\d*)>$/);
        return matcher
            ? matcher[1]
            : message.match(/\d*/)
                ? message
                : undefined;
    }
}