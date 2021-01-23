import { GuildService } from '../../src/services/guild_service';
import container from '../../inversify.config';
import { TYPES } from '../../src/types';
import { Guild, IGuild } from '../../src/models/guild';
import { GuildRepository } from '../../src/data_access/repositories/guild_repository';
import { Guild as DiscordGuild } from 'discord.js';
import * as mongoose from 'mongoose';

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
        guildMock1.id, guildMock2.id = '1234567890';
        guildMock1.name = 'Test Server Name';
        guildMock2.name = 'Changed Test Server Name';
    });
    beforeEach(() => {
        jest.resetAllMocks();
    })
    afterAll(async (done) => {
        await mongoose.disconnect();
        done();
    });
    describe('saving Guild documents', () => {
        test('save calls save in repository', async () => {
            await guildService.saveDiscordGuild(guildMock1);
            expect(repoMock.save).toHaveBeenCalled();
        });
        test('save called with new Guild creates new GuildDoc and saves', async () => {
            repoMock.existsById = jest.fn().mockReturnValueOnce(false);
            await guildService.saveDiscordGuild(guildMock1);
            expect(repoMock.save).toHaveBeenCalled();
        });
        test('save called with existing Guild updates GuildDoc and saves', async () => {
            repoMock.existsById = jest.fn().mockReturnValueOnce(true);
            let iGuildMock = jest.createMockFromModule('../../src/models/guild') as IGuild;
            iGuildMock._id = guildMock2.id;
            iGuildMock.name = guildMock2.name;
            iGuildMock.prefix = '!';
            repoMock.findById = jest.fn().mockImplementationOnce(() => Promise.resolve(iGuildMock));
            await guildService.saveDiscordGuild(guildMock2);
            expect(repoMock.save).toHaveBeenLastCalledWith(Guild.build(iGuildMock));
        });
        test('update calls save in repository', async () => {
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