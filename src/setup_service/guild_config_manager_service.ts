import { Message, MessageEmbed } from 'discord.js';
import { inject, injectable, unmanaged } from 'inversify';
import { Bot } from '../bot';
import { IGuild } from '../models/guild';
import { TYPES } from '../types';
import { ClientTools } from '../utilities/client_tools';
import { GuildService } from '../services/guild_service';
import { DynamicPage, Page } from './pages/page';
import { PageSet } from './pages/page_set';
import { SetupService } from './generics/setup_service';
import addGuildConfigPages from './page_sets/guild_config_pages';

@injectable()
export class GuildConfigManagerService extends SetupService<IGuild> {

    private readonly _GuildService: GuildService;

    public constructor(
        @inject(TYPES.Bot) bot: Bot,
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.GuildService) guildService: GuildService,
        @unmanaged() message: Message,
        @unmanaged() template: IGuild
    ) {
        super(bot, clientTools, message, template, true);
        this._GuildService = guildService;
        this._pageSet = this.createPageSet();
    }

    protected get isFinished(): boolean {
        return true;
    }

    protected save(): Promise<boolean> {
        return this._GuildService.save(this._template as IGuild);
    }
    
    protected getStartPage(): MessageEmbed {
        return super.getStartPage()
            .setTitle('Guild Config Setup');
    }
    
    protected getEndPage(finished?: boolean): MessageEmbed {
        const {prefix, admins, mods} = this._template;

        const description = !finished ? this._EndPageDescription : this._EndPageDefaultFinalDescription;

        const embed = this._ClientTools.getStandardEmbed();
        if (description) {embed.setDescription(description);}
        this._ClientTools.addFieldToEmbed(embed, 'Prefix', prefix, {inline: true});
        this._ClientTools.addFieldToEmbed(embed, 'Admin Roles', admins, {default: 'None', inline: true});
        this._ClientTools.addFieldToEmbed(embed, 'Mod Roles', mods, {default: 'None', inline: true});
        return embed;
    }
    
    protected createPageSet(): PageSet<IGuild> {
        const pageSet = new PageSet<IGuild>(this._template);
        // add start page
        pageSet.addPage(new Page(this.getStartPage()));

        // add body pages
        addGuildConfigPages(pageSet, this._template, this.guild);

        // add end page
        pageSet.addPage(new DynamicPage(
            {},
            (fields: Partial<IGuild>): MessageEmbed => {
                return this.getEndPage();
            }
        ));
        return pageSet;
    }
}