import { GuildService } from '../../src/services/guild_service';
import container from '../../inversify.config';
import { TYPES } from '../../src/types';
import { Guild, IGuild } from '../../src/models/guild';
import { GuildRepository } from '../../src/data_access/repositories/guild_repository';
import { Client, Guild as DiscordGuild } from 'discord.js';

describe('GuildService', () => {
    let guildService: GuildService;
    let repoMock: GuildRepository;
    let guildMock1: DiscordGuild;
    let guildMock2: DiscordGuild;

    beforeAll(() => {
        repoMock = jest.createMockFromModule('../../src/data_access/repositories/guild_repository');
        repoMock.existsById = jest.fn();
        repoMock.save = jest.fn();
        repoMock.findById = jest.fn();
        repoMock.findAll = jest.fn();
        container.rebind<GuildRepository>(TYPES.GuildRepository).toConstantValue(repoMock);

        guildService = container.get<GuildService>(TYPES.GuildService);

        guildMock1 = jest.createMockFromModule('discord.js');
        guildMock2 = jest.createMockFromModule('discord.js');
        guildMock1.id = guildMock2.id = '1234567890';
        guildMock1.ownerID = guildMock2.ownerID = '0987654321';
        guildMock1.name = 'Test Server Name';
        guildMock2.name = 'Changed Test Server Name';
    });
    beforeEach(() => {
        jest.resetAllMocks();
    })
    afterAll(() => {
        container.get<Client>(TYPES.Client).destroy();
    });
    describe('saving Guild documents', () => {
        beforeEach(() => {
            repoMock.existsById = jest.fn().mockResolvedValue(false);
        })
        test('saveDiscordGuild calls save in repository', async () => {
            await guildService.saveDiscordGuild(guildMock1);
            expect(repoMock.save).toHaveBeenCalled();
        });
        test('saveDiscordGuild called with new Guild creates new GuildDoc and saves', async () => {
            await guildService.saveDiscordGuild(guildMock1);
            expect(repoMock.save).toHaveBeenCalled();
        });
        test('saveDiscordGuild called with existing Guild updates GuildDoc and saves', async () => {
            repoMock.existsById = jest.fn().mockResolvedValueOnce(true);
            let iGuildMock: IGuild = {
                _id: guildMock1.id,
                name: guildMock1.name,
                owner: guildMock1.ownerID,
                prefix: '!'
            };
            repoMock.findById = jest.fn().mockResolvedValueOnce(iGuildMock);
            iGuildMock.name = guildMock2.name;
            await guildService.saveDiscordGuild(guildMock2);
            expect(repoMock.save).toHaveBeenLastCalledWith(iGuildMock);
        });
        test('save calls save in repository', async () => {
            let iGuild = jest.createMockFromModule<IGuild>('../../src/models/guild');
            await guildService.save(iGuild);
            expect(repoMock.save).toHaveBeenCalled();
        });
    });
    describe('finding Guild documents', () => {
        test('findById calls findById in repository', async () => {
            await guildService.findById(guildMock1.id);
            expect(repoMock.findById).toHaveBeenLastCalledWith(guildMock1.id);
        });
        test('findAll calls findAll in repository', async () => {
            await guildService.findAll();
            expect(repoMock.findAll).toHaveBeenCalled();
        });
    });
});