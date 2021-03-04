import { injectable, inject, unmanaged } from 'inversify';
import { TYPES } from '../../types';
import { SetupService } from './setup_service';
import { Bot } from '../../bot';
import { IRaidTemplate, getRaidTemplate } from '../../models/templates/raid_template';
import { Message, MessageEmbed } from 'discord.js';
import { RaidTemplateService } from '../raid_template_service';
import { Page, DynamicPage } from './pages/page';
import { ClientTools } from '../../utilities/client_tools';
import { PageSet } from './pages/page_set';
import addRaidTemplatePages from './page_sets/raid_template_pages';

@injectable()
export class RaidTemplateManager extends SetupService<IRaidTemplate> {

    private readonly _RaidTemplateService: RaidTemplateService;

    public constructor(
        @inject(TYPES.Bot) bot: Bot,
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.RaidTemplateService) raidTemplateService: RaidTemplateService,
        @unmanaged() message: Message,
        @unmanaged() template = getRaidTemplate({guildId: message.guild.id})
    ) {
        super(bot, clientTools, message, template);
        this._RaidTemplateService = raidTemplateService;
        this._pageSet = this.createPageSet();
    }

    protected get isFinished(): boolean {
        const {name, description, primaryReact} = this._template;
        if (!name || name === '') {
            return false;
        }
        if (!description || description === '') {
            return false;
        }
        if (!primaryReact || primaryReact === '') {
            return false;
        }
        return true;
    }

    public save(): Promise<boolean> {
        return this._RaidTemplateService.save(this._template as IRaidTemplate);
    }

    public getStartPage(): MessageEmbed {
        return this._ClientTools.getStandardEmbed()
            .setTitle("Raid Template Service")
            .setDescription('To use this service, send a response in this channel whenever prompted. ' +
            '\nYou can navigate the pages by reacting with ⬅ and ➡. To change pages again, just unreact and react again. ' +
            '\nTo cancel this setup at any time, react with ❌. Doing this will discard all changes made. ');
    }
    
    public getEndPage(finished?: boolean): MessageEmbed {
        const {name, description, primaryReact, secondaryReacts, secondaryReactLimits, additionalReacts} = this._template;
        let embed: MessageEmbed = this._ClientTools.getStandardEmbed()
            .setTitle("End");
        if (finished) {
            this._ClientTools.addFieldToEmbed(embed, 'Complete', 'The template has been saved and is ready to use!');
        }
        this._ClientTools.addFieldToEmbed(embed, 'Name', name ? name : 'Unset');
        this._ClientTools.addFieldToEmbed(embed, 'Description', description ? description : 'Unset');
        this._ClientTools.addFieldToEmbed(embed, 'Primary React', primaryReact ? primaryReact : 'Unset', {inline: true});
        for (let i=0; i<secondaryReacts.length; i++) {
            this._ClientTools.addFieldToEmbed(embed, 'Secondary React', `${secondaryReacts[i]}: ${secondaryReactLimits[i]}`, {inline: true});
        }
        this._ClientTools.addFieldToEmbed(embed, 'Additional Reacts', additionalReacts.length > 0 ? additionalReacts : 'None');

        if (!finished) {
            this._ClientTools.addFieldToEmbed(embed, 'Error', 'Name, description, or Primary React left undefined. These are required.');
        }
        
        return embed;
    }

    public createPageSet(): PageSet<IRaidTemplate> {
        let pageSet = new PageSet(this._template);
        // add start page
        pageSet.addPage(new Page(this.getStartPage()));

        // add body pages
        addRaidTemplatePages(pageSet, this._template, this.guild.id);

        // add end page
        pageSet.addPage(new DynamicPage(
            {},
            (fields: Partial<IRaidTemplate>): Promise<MessageEmbed> => {
                return Promise.resolve(this.getEndPage());
            },
            async (fields: Partial<IRaidTemplate>, res: string): Promise<string> => {
                return Promise.resolve('');
            }
        ));
        return pageSet;
    }
}