import { MessageParser } from '../../src/utilities/message_parser';

describe('MessageParser', () => {

    describe('message parsing', () => {
        describe('parseCommand', () => {
            test('parseCommand returns [one] when given: one', () => {
                const act = MessageParser.parseMessage('one');
                const exp = ['one'];
                expect(act).toEqual(exp);
            });
            test('parseCommand returns [one two] when given: "one two"', () => {
                const act = MessageParser.parseMessage('"one two"');
                const exp = ['one two'];
                expect(act).toEqual(exp);
            });
            test('parseCommand returns [one two, three four] when given: "one two" "three four"', () => {
                const act = MessageParser.parseMessage('"one two" "three four"');
                const exp = ['one two', 'three four'];
                expect(act).toEqual(exp);
            });
            test('parseCommand returns [one two, three four, five six] when given: "one two" \'three four\' "five six"', () => {
                const act = MessageParser.parseMessage('"one two" \'three four\' "five six"');
                const exp = ['one two', 'three four', 'five six'];
                expect(act).toEqual(exp);
            });
            test('parseCommand returns [one, <@&123>] when given: one <@&123>', () => {
                const act = MessageParser.parseMessage('one <@&123>');
                const exp = ['one', '<@&123>'];
                expect(act).toEqual(exp);
            });
        });
        describe('parseNumber', () => {
            test('parseNumber returns 0 when given 0', () => {
                expect(MessageParser.parseNumber("0")).toBe(0);
            });
            test('parseNumber returns -1 when given -1', () => {
                expect(MessageParser.parseNumber("-1")).toBe(-1);
            });
            test('parseNumber returns 1 when given 1', () => {
                expect(MessageParser.parseNumber("1")).toBe(1);
            });
            test('parseNumber returns -10 when given -10', () => {
                expect(MessageParser.parseNumber("-10")).toBe(-10);
            });
            test('parseNumber returns 10 when given 10', () => {
                expect(MessageParser.parseNumber("10")).toBe(10);
            });
            test('parseNumber returns 0 when given abc', () => {
                expect(MessageParser.parseNumber("abc")).toBe(0);
            });
            test('parseNumber returns 0 when given 1a2bc', () => {
                expect(MessageParser.parseNumber("1a2bc")).toBe(0);
            });
        });
    });
});