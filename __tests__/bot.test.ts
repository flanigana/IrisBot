import container from "../inversify.config";
import { TYPES } from "../src/types";
import { Client, Message, TextChannel, User } from "discord.js";
import { Bot } from "../src/bot";

describe('Bot', () => {
    let bot: Bot;
    let client: Client;
    let channelMock: TextChannel;
    let userMock: User;
    let messageMock: Message;
    beforeAll(async (done) => {
        client = container.get<Client>(TYPES.Client);
        bot = container.get<Bot>(TYPES.Bot);
        await bot.listen(false).catch(console.error);
        done();
    });
    beforeEach(() => {
        jest.clearAllMocks();
        channelMock = jest.createMockFromModule('discord.js');
        userMock = jest.createMockFromModule('discord.js');
        userMock.bot = false;
        messageMock = jest.createMockFromModule('discord.js');
        messageMock.author = userMock;
    });
    afterAll(() => {
        bot.logout();
    });
    describe('startsWithValidPrefix', () => {
        test('startsWithValidPrefix returns false when message does not begin with valid prefix', () => {
            messageMock.content = 'test';
            expect(bot.startsWithValidPrefix(messageMock)).toBeFalsy();
        });
        test('startsWithValidPrefix returns true when message does begin with valid prefix', () => {
            messageMock.content = '-test';
            expect(bot.startsWithValidPrefix(messageMock)).toBeTruthy();
        });
    });
    describe('client events', () => {
        describe('message events', () => {
            test('startsWithValidPrefix is not called when message author is a bot', () => {
                bot.startsWithValidPrefix = jest.fn();
                messageMock.content = 'test';
                messageMock.author.bot = true;
                client.emit('message', messageMock);
                expect(bot.startsWithValidPrefix).toHaveBeenCalledTimes(0);
            });
            test('startsWithValidPrefix is called when message is received and author is not a bot', () => {
                bot.startsWithValidPrefix = jest.fn();
                messageMock.content = 'test';
                client.emit('message', messageMock);
                expect(bot.startsWithValidPrefix).toHaveBeenCalledTimes(1);
            });
        });
    });
});