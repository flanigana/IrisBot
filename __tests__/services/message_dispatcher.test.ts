import { MessageDispatcher } from '../../src/services/message_dispatcher';
import container from '../../inversify.config';
import { TYPES } from '../../src/types';
import { Client, TextChannel, Message, Guild } from 'discord.js';
import { GuildService } from '../../src/services/guild_service';
import { IGuild } from '../../src/models/guild';

describe('MessageDispatcher', () => {
    let messageDispatcher: MessageDispatcher;
    let clientMock: Client;
    let guildServiceMock: GuildService;
    let iGuildMock: IGuild;
    let guildMock: Guild;
    let messageMock: Message;

    beforeAll(() => {
        clientMock = jest.createMockFromModule('discord.js');
        container.get<Client>(TYPES.Client).destroy();
        container.rebind<Client>(TYPES.Client).toConstantValue(clientMock);
        guildServiceMock = jest.createMockFromModule('../../src/services/guild_service.ts');
        container.rebind<GuildService>(TYPES.GuildService).toConstantValue(guildServiceMock);
        
        guildMock = jest.createMockFromModule('discord.js');
        iGuildMock = jest.createMockFromModule('../../src/models/guild.ts');
        guildMock.id, iGuildMock._id = '1234567890';
        iGuildMock.prefix = '!';
        messageMock = jest.createMockFromModule('discord.js');
        messageMock.content = '';
        Object.defineProperty(messageMock, 'guild', {get: () => guildMock});

        messageDispatcher = container.get<MessageDispatcher>(TYPES.MessageDispatcher);
    });
    beforeEach(() => {
        jest.resetAllMocks();
    });
    describe('message parsing', () => {
        describe('parseCommand', () => {
            test('parseCommand returns [one] when given: one', () => {
                const act = messageDispatcher.parseCommand('one');
                const exp = ['one'];
                expect(act).toEqual(exp);
            });
            test('parseCommand returns [one two] when given: "one two"', () => {
                const act = messageDispatcher.parseCommand('"one two"');
                const exp = ['one two'];
                expect(act).toEqual(exp);
            });
            test('parseCommand returns [one two, three four] when given: "one two" "three four"', () => {
                const act = messageDispatcher.parseCommand('"one two" "three four"');
                const exp = ['one two', 'three four'];
                expect(act).toEqual(exp);
            });
            test('parseCommand returns [one two, three four, five six] when given: "one two" \'three four\' "five six"', () => {
                const act = messageDispatcher.parseCommand('"one two" \'three four\' "five six"');
                const exp = ['one two', 'three four', 'five six'];
                expect(act).toEqual(exp);
            });
            test('parseCommand returns [one, <@&123>] when given: one <@&123>', () => {
                const act = messageDispatcher.parseCommand('one <@&123>');
                const exp = ['one', '<@&123>'];
                expect(act).toEqual(exp);
            });
        });
        describe('parseGuildCommand', () => {
            test('parseGuildCommand returns [one] when given: !one', () => {
                const act = messageDispatcher.parseGuildCommand(iGuildMock, '!one');
                const exp = ['one'];
                expect(act).toEqual(exp);
            });
            test('parseGuildCommand returns [one, two] when given: !one two', () => {
                const act = messageDispatcher.parseGuildCommand(iGuildMock, '!one two');
                const exp = ['one', 'two'];
                expect(act).toEqual(exp);
            });
            test('parseGuildCommand returns [one two] when given: !"one two"', () => {
                const act = messageDispatcher.parseGuildCommand(iGuildMock, '!"one two"');
                const exp = ['one two'];
                expect(act).toEqual(exp);
            });
        });
    });
    describe('handle guild messages', () => {
        beforeAll(() => {
            let channelMock: TextChannel = jest.createMockFromModule('discord.js');
            channelMock.type = 'text';
            messageMock.channel = channelMock;
        });
        beforeEach(() => {
            guildServiceMock.findById = jest.fn().mockReturnValue(iGuildMock);
        });
        test('handleMessage calls handleGuildMessage when channel type is "text"', () => {
            const spy = jest.spyOn(messageDispatcher, 'handleGuildMessage');
            messageDispatcher.handleMessage(messageMock);
            expect(spy).toHaveBeenCalledTimes(1);
            spy.mockRestore();
        });
        describe('checking message for guild prefix', () =>  {
            let spy;
            beforeEach(() => {
                spy = jest.spyOn(messageDispatcher, 'parseGuildCommand');
            });
            afterAll(() => {
                spy.mockRestore();
            });
            test('handleGuildMessage calls parseGuildCommand when message starts with Guild prefix', async () => {
                messageMock.content = '!test';
                await messageDispatcher.handleGuildMessage(messageMock);
                expect(spy).toHaveBeenCalledTimes(1);
            });
            test('handleGuildMessage does not call parseGuildCommand when message does not start with Guild prefix', async () => {
                messageMock.content = 'test';
                await messageDispatcher.handleGuildMessage(messageMock);
                expect(spy).toHaveBeenCalledTimes(0);
            });
        });
    });
});