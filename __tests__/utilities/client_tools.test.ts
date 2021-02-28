import { ClientTools } from '../../src/utilities/client_tools';
import container from '../../inversify.config';
import { TYPES } from '../../src/types';
import { Client, ClientUser, MessageEmbed } from 'discord.js';

describe('ClientTools', () => {
    let clientTools: ClientTools;
    let clientMock: Client;
    let userMock: ClientUser;

    beforeAll(() => {
        clientMock = jest.createMockFromModule('discord.js');
        userMock = jest.createMockFromModule('discord.js');

        userMock.avatarURL = jest.fn();
        clientMock.user = userMock;

        container.get<Client>(TYPES.Client).destroy();
        container.rebind<Client>(TYPES.Client).toConstantValue(clientMock);

        clientTools = container.get<ClientTools>(TYPES.ClientTools);
    });

    describe('MessageEmbed-related', () => {
        let embed: MessageEmbed;
        beforeEach(() => {
            embed = new MessageEmbed();
        });
        describe('getStandardEmbed', () => {
            test('getStandardEmbed returns MessageEmbed with color', () => {
                expect(clientTools.getStandardEmbed().color).not.toBeNull();
            });
            test('getStandardEmbed returns MessageEmbed with footer', () => {
                expect(clientTools.getStandardEmbed().footer).not.toBeNull();
            });
            test('getStandardEmbed returns MessageEmbed with timestamp', () => {
                expect(clientTools.getStandardEmbed().timestamp).not.toBeNull();
            });
        });
        describe('addFieldToEmbed', () => {
            test('addFieldToEmbed does not add field when given empty value string', () => {
                clientTools.addFieldToEmbed(embed, "test", '');
                expect(embed.fields.length).toBe(0);
            });
            test('addFieldToEmbed does not add field when given undefined value string', () => {
                clientTools.addFieldToEmbed(embed, "test", undefined);
                expect(embed.fields.length).toBe(0);
            });
            test('addFieldToEmbed does not add field when given empty value array', () => {
                clientTools.addFieldToEmbed(embed, "test", []);
                expect(embed.fields.length).toBe(0);
            });
            test('addFieldToEmbed does not add field when given value array with empty string', () => {
                clientTools.addFieldToEmbed(embed, "test", ['']);
                expect(embed.fields.length).toBe(0);
            });
            test('addFieldToEmbed adds field when given non-empty value string', () => {
                clientTools.addFieldToEmbed(embed, "test", 'test');
                expect(embed.fields.length).toBe(1);
            });
            test('addFieldToEmbed adds field when given non-empty value array of length 1', () => {
                clientTools.addFieldToEmbed(embed, "test", ['test']);
                expect(embed.fields.length).toBe(1);
            });
            test('addFieldToEmbed adds field when given non-empty value array of length 2', () => {
                clientTools.addFieldToEmbed(embed, "test", ['test', 'test']);
                expect(embed.fields.length).toBe(1);
            });
        });
    });
});