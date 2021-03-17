import { Message, MessageEmbed } from "discord.js";
import { inject, injectable, unmanaged } from "inversify";
import { getBlankVerificationTemplate, IVerificationTemplate } from "../models/verification_template";
import { PageSet } from "./pages/page_set";
import { SetupService } from "./generics/setup_service";
import { Bot } from "../bot";
import { ClientTools } from "../utilities/client_tools";
import { VerificationTemplateService } from "../services/verification_template_service";
import { TYPES } from "../types";
import { DynamicPage, Page } from "./pages/page";

@injectable()
export class VerificationTemplateManagerService extends SetupService<IVerificationTemplate> {

    private readonly _VerificationTemplateService: VerificationTemplateService;

    public constructor(
        @inject(TYPES.Bot) bot: Bot,
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.VerificationTemplateService) verificationTemplateService: VerificationTemplateService,
        @unmanaged() message: Message,
        @unmanaged() template = getBlankVerificationTemplate({guildId: message.guild.id}),
        @unmanaged() updatable = false
    ) {
        super(bot, clientTools, message, template, updatable);
        this._VerificationTemplateService = verificationTemplateService;
        this._pageSet = this.createPageSet();
    }

    protected get isFinished(): boolean {
        const {name, verificationChannel, verifiedRoles} = this._template;
        if (!name || name === '') {
            return false;
        }
        if (!verificationChannel || verificationChannel === '') {
            return false;
        }
        if (!verifiedRoles || !verifiedRoles.length) {
            return false;
        }
        return true;
    }

    protected save(): Promise<boolean> {
        return this._VerificationTemplateService.save(this._template as IVerificationTemplate);
    }

    protected getStartPage(): MessageEmbed {
        return super.getStartPage()
            .setTitle('Verification Template Service');
    }

    protected getEndPage(finished?: boolean): MessageEmbed {
        const {name, verificationChannel, logChannel, verifiedRoles, removeRoles, fame, rank, dungeonRequirements, requireHidden} = this._template;

        const embedDescription = !finished ? this._EndPageDescription : '';
        
        const embed = this._ClientTools.getStandardEmbed()
            .setTitle('End');
        if (embedDescription) {embed.setDescription(embedDescription);}
        this._ClientTools.addFieldToEmbed(embed, 'Name', name, {default: 'Unset'});
        this._ClientTools.addFieldToEmbed(embed, 'Verification Channel', verificationChannel, {default: 'Unset', inline: true});
        this._ClientTools.addFieldToEmbed(embed, 'Log Channel', logChannel, {default: 'Unset', inline: true});
        this._ClientTools.addFieldToEmbed(embed, 'Verified Roles to Give', verifiedRoles, {default: 'None'});
        this._ClientTools.addFieldToEmbed(embed, 'Roles to Remove Upon Verification', removeRoles, {default: 'None'});
        this._ClientTools.addFieldToEmbed(embed, 'Fame Requirement', `${fame}`, {inline: true});
        this._ClientTools.addFieldToEmbed(embed, 'Rank Requirement', `${rank}`, {inline: true});
        this._ClientTools.addFieldToEmbed(embed, 'Dungeon Requirements', dungeonRequirements, {default:'None', separator: '\n'});
        this._ClientTools.addFieldToEmbed(embed, 'Require Hidden RealmEye Profile?', requireHidden ? 'Yes' : 'No');

        if (!finished) {
            this._ClientTools.addFieldToEmbed(embed, 'Error', 'Name, Verification Channel, and at least one Verified Role are all required.');
        }

        return embed;
    }

    protected createPageSet(): PageSet<IVerificationTemplate> {
        const pageSet = new PageSet<IVerificationTemplate>(this._template);
        // add start page
        pageSet.addPage(new Page(this.getStartPage()));

        // add body pages

        // add end page
        pageSet.addPage(new DynamicPage(
            {},
            (fields: Partial<IVerificationTemplate>): MessageEmbed => {
                return this.getEndPage();
            }
        ));
        return pageSet;
    }
    
}