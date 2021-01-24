import { Bot } from '../src/bot';
import container from '../inversify.config';
import { TYPES } from '../src/types';
import { Client, Guild, Message, TextChannel, User } from 'discord.js';
import { GuildService } from '../src/services/guild_service';

describe('Bot', () => {
    let bot: Bot;
    let client: Client;
    let guildMock: Guild;
    let channelMock: TextChannel;
    let userMock: User;
    let messageMock: Message;
    let guildServiceMock: GuildService;

    beforeAll(async (done) => {
        client = container.get<Client>(TYPES.Client);

        guildServiceMock = jest.createMockFromModule('../src/services/guild_service.ts');
        container.rebind<GuildService>(TYPES.GuildService).toConstantValue(guildServiceMock);

        guildMock = jest.createMockFromModule('discord.js');
        channelMock = jest.createMockFromModule('discord.js');
        userMock = jest.createMockFromModule('discord.js');
        messageMock = jest.createMockFromModule('discord.js');
        userMock.bot = false;
        messageMock.author = userMock;
        guildServiceMock.saveDiscordGuild = jest.fn();
        
        bot = container.get<Bot>(TYPES.Bot);
        await bot.listen(false).catch(console.error);
        done();
    });
    beforeEach(() => {
        jest.resetAllMocks();
    });
    afterAll(async (done) => {
        await bot.logout();
        done();
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
                client.emit<'message'>('message', messageMock);
                expect(bot.startsWithValidPrefix).toHaveBeenCalledTimes(0);
            });
            test('startsWithValidPrefix is called when message is received and author is not a bot', () => {
                bot.startsWithValidPrefix = jest.fn();
                messageMock.content = 'test';
                messageMock.author.bot = false;
                client.emit<'message'>('message', messageMock);
                expect(bot.startsWithValidPrefix).toHaveBeenCalledTimes(1);
            });
        });
        describe('guild events', () => {
            test('GuildService save is called when Client emits guildCreate', () => {
                client.emit<'guildCreate'>('guildCreate', guildMock);
                expect(guildServiceMock.saveDiscordGuild).toHaveBeenCalledTimes(1);
            });
            test('GuildService save is called when Client emits guildCreate', () => {
                client.emit<'guildUpdate'>('guildUpdate', guildMock, guildMock);
                expect(guildServiceMock.saveDiscordGuild).toHaveBeenCalledTimes(1);
            });
        });
    });
});