import { Collection, Guild, GuildEmoji, GuildMember, Message, MessageEmbed, MessageReaction, ReactionCollector, ReactionEmoji, TextChannel, User, VoiceChannel } from 'discord.js';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../types';
import { ClientTools } from '../../utilities/client_tools';
import { RolesAndChannels } from '../../utilities/role_and_channel_finder';
import logger from '../../../winston';
import { RaidTemplateService } from '../raid_template_service';
import { IRaidTemplate } from '../../models/templates/raid_template';
import { GuildService } from '../guild_service';
import { ReactionTracker } from './reaction_tracker';
import { RaidStatus } from './raid_status';

type RaidProperties = {
    template: IRaidTemplate,
    guild: Guild,
    starter: GuildMember,
    alertChannel: TextChannel,
    idleChannel: VoiceChannel,
    destChannel: VoiceChannel,
    location: string,
    remainingTime: number,
    status: RaidStatus,
    limitedReactions: Map<string, ReactionTracker>,
    raiders: Set<GuildMember>,
    raidLeaders: Set<GuildMember>,
    notifMessage?: Message,
    raidMessage?: Message,
    interval?: NodeJS.Timeout,
    stoppedBy?: GuildMember
}

@injectable()
export class RaidManager {
    
    private readonly _ClientTools: ClientTools;
    private readonly _RaidTemplateService: RaidTemplateService;
    private readonly _GuildService: GuildService;

    public constructor(
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.RaidTemplateService) raidTemplateService: RaidTemplateService,
        @inject(TYPES.GuildService) guildService: GuildService
    ) {
        this._ClientTools = clientTools;
        this._RaidTemplateService = raidTemplateService;
        this._GuildService = guildService;
    }

    /**
     * Creates a Map of reacts to members who have confirmed with that react during the afk check
     * @param template the template to pull react information from 
     * @returns A Map of emoji names to a set of members who have confirmed their reaction with that emoji
     */
    private buildLimitedReactions({secondaryReacts, secondaryReactLimits}: IRaidTemplate): Map<string, ReactionTracker> {
        const reacts = new Map<string, ReactionTracker>();
        for (let i=0; i<secondaryReacts.length; i++) {
            const react = secondaryReacts[i];
            const limit = secondaryReactLimits[i];
            reacts.set(react, new ReactionTracker(react, limit));
        }
        return reacts;
    }

    /**
     * Creates an object containing the raid options
     * @param message message sent by the user
     * @param args list of parsed arguments from the message
     * @returns a RaidProperties object containing information to use during the raid
     */
    private async buildRaidProperties(message: Message, args: string[]): Promise<RaidProperties> {
        const template = await this._RaidTemplateService.findTemplate(message.guild.id, args[2], false);
        return {
            template: template,
            guild: message.guild,
            starter: this._GuildService.findGuildMember(message.guild, message.author.id),
            alertChannel: RolesAndChannels.getChannel(message.guild, args[3], 'text') as TextChannel,
            idleChannel: RolesAndChannels.getChannel(message.guild, args[4], 'voice') as VoiceChannel,
            destChannel: RolesAndChannels.getChannel(message.guild, args[5], 'voice') as VoiceChannel,
            location: args.length > 6 ? args[6] : undefined,
            remainingTime: 120 * 1000,
            status: RaidStatus.RUNNING,
            limitedReactions: this.buildLimitedReactions(template),
            raiders: new Set<GuildMember>(),
            raidLeaders: new Set<GuildMember>()
        }
    }

    // TODO: Include check for nitro boosters
    /**
     * Returns a filtering function for the reaction collector of the raid message
     * @param properties the options object to read raid information from
     * @returns a filtering function returning true on relevant reactions
     */
    private createReactionFilter({guild, template, limitedReactions}: RaidProperties): (reaction: MessageReaction, user: User) => boolean {
        return ({emoji}: MessageReaction, user: User): boolean => {
            if (user.bot) {
                return false;
            }
            if ((emoji.name === '✅' || emoji.name === '❌') && this._GuildService.isRaidLeader(guild, user.id)) {
                return true;
            } else if (emoji.toString() === template.primaryReact || limitedReactions.has(emoji.toString())) {
                return true;
            } else {
                return false;
            }
        }
    }

    /**
     * Adds the reactor to the destination voice channel and the list of raiders
     * @param user user who reacted
     * @param properties the options object to read raid information from
     */
    private onPrimaryReact(user: User, {guild, idleChannel, destChannel, raiders, raidLeaders}: RaidProperties): void {
        const guildMember = this._GuildService.findGuildMember(guild, user.id);
        const voiceChannelID = guildMember.voice.channelID;
        if (voiceChannelID === idleChannel.id || voiceChannelID === destChannel.id) {
            if (this._GuildService.isRaidLeader(guild, user.id)) {
                raidLeaders.add(guildMember);
            }
            raiders.add(guildMember);
            guildMember.voice.setChannel(destChannel);
        }
    }

    /**
     * Sends the given user a dm asking them to confirm their reaction and waits for their reaction
     * @param reaction reaction from the user
     * @param user user who reacted
     * @returns true if user confirms reaction or false otherwise
     */
    private confirmReaction(emoji: GuildEmoji | ReactionEmoji, user: User): Promise<boolean> {
        return user.send(`You reacted with ${emoji} for the raid. Please confirm by reacting with ✅ or react with ❌ to cancel.`).then(confirmation => {
            confirmation.react('✅');
            confirmation.react('❌');

            function filter(r: MessageReaction, u: User) {
                if (!u.bot && (r.emoji.name === '✅' || r.emoji.name === '❌')) {
                    return true;
                } else {
                    return false;
                }
            }

            return confirmation.awaitReactions(filter, {max: 1, time: 60000}).then(collected => {
                return collected.every(r => {
                    if (r.emoji.name === '✅') {
                        return true;
                    } else {
                        return false;
                    }
                })
            });
        })
    }

    // TODO: Add confirmation message editing on confirmed reaction
    /**
     * Handles any of the secondary reactions for a raid
     * @param emoji emoji the user reacted with
     * @param user user who reacted
     * @param properties the options object to read raid information from
     */
    private onSecondaryReact(emoji: GuildEmoji | ReactionEmoji, user: User, {guild, location, limitedReactions}: RaidProperties): void {
        const tracker = limitedReactions.get(emoji.toString());
        const guildMember = this._GuildService.findGuildMember(guild, user.id);
        if (!tracker.has(guildMember)) {
            this.confirmReaction(emoji, user).then(confirmed => {
                if (confirmed && !limitedReactions.get(emoji.toString()).atMaxSize) {
                    tracker.addReactor(guildMember);
                    if (location) {
                        user.send(`You are now confirmed with ${emoji} for the raid. Please go to \`${location}\` with your ${emoji}.`);
                    } else {
                        user.send(`You are now confirmed with ${emoji} for the raid. Please go to the location announced with your ${emoji}.`);
                    }
                } else if (confirmed) {
                    user.send(`The raid has already reached the limit for ${emoji}'s.`);
                } else {
                    user.send(`You have successfully cancelled your ${emoji} reaction for the raid.`);
                }
            });
        }
    }

    // TODO: Add Nitro Booster check on collection
    /**
     * Handles each reaction collection by its type
     * @param emoji emoji the user reacted with
     * @param user user who reacted
     * @param collector message reaction collector
     * @param properties the options object to read raid information from
     */
    private onReactionCollection(emoji: GuildEmoji | ReactionEmoji, user: User, collector: ReactionCollector, properties: RaidProperties): void {
        if (emoji.name === '✅' || emoji.name === '❌') {
            if (emoji.name === '❌') {
                properties.status = RaidStatus.CANCELLED;
            }
            properties.stoppedBy = this._GuildService.findGuildMember(properties.guild, user.id);
            collector.stop();
        } else if (emoji.toString() === properties.template.primaryReact) {
            this.onPrimaryReact(user, properties);
        } else if (properties.limitedReactions.has(emoji.toString())) {
            this.onSecondaryReact(emoji, user, properties);
        }
    }

    /**
     * Remove users from the raiding voice channel that failed to react to the afk check
     * @param properties the options object to read raid information from
     */
    private moveAfk({guild, destChannel, raiders}: RaidProperties): void {
        destChannel.members.forEach(member => {
            if (!raiders.has(member)  && !this._GuildService.isRaidLeader(guild, member.id)) {
                member.voice.kick("Raider failed to react for raid.");
            }
        });
    }

    /**
     * Updates the raid message to show the end status of the raid
     * @param properties the options object to read raid information from
     */
    private updateRaidMessage({status, template, raidMessage, destChannel, starter, stoppedBy, raiders, raidLeaders}: RaidProperties): void {
        const embed = this._ClientTools.getStandardEmbed();
        switch (status) {
            case RaidStatus.RUNNING:
            embed.setColor("#00FF00")
                .setAuthor(`${template.name} successfully started by ${starter.displayName} in ${destChannel.name}.`, starter.user.avatarURL())
                .setDescription(`The raid has started with ${raidLeaders.size} raid leaders and ${raiders.size} raiders.`);
            if (stoppedBy) {
                embed.setFooter(`Stopped early by ${stoppedBy.displayName}`);
            }
            break;
        case RaidStatus.CANCELLED:
            embed.setColor("#F05E23")
                .setAuthor(`${template.name} started by ${starter.displayName} has been cancelled.`, starter.user.avatarURL())
                .setFooter(`Cancelled by ${stoppedBy.displayName}`);
            break;
        }
        raidMessage.edit(embed);
    }

    /**
     * Handles the end of the afk-check including
     *  - clearing the message update interval
     *  - kicking users from the destination vc who failed to react to the raid message
     *  - deletes the notification message
     *  - updates the raid message to reflect the end of raid status
     *  - sets the raid status to complete (if not cancelled)
     * @param properties the options object to read raid information from
     */
    private onCollectorEnd(properties: RaidProperties): void {
        if (properties.interval) {
            clearInterval(properties.interval);
        }
        if (properties.status !== RaidStatus.CANCELLED) {
            this.moveAfk(properties);
        }
        if (properties.notifMessage?.deletable) {
            properties.notifMessage?.delete();
        }
        this.updateRaidMessage(properties);
        if (properties.status === RaidStatus.RUNNING) {
            properties.status = RaidStatus.COMPLETED;
        }
    }

    /**
     * Creates the reaction collector for the raid message that handles all of the reacts
     * @param properties the options object to read raid information from
     */
    private startReactionCollector(properties: RaidProperties) {
        const collector = properties.raidMessage.createReactionCollector(this.createReactionFilter(properties), {time: properties.remainingTime});
        collector.on('collect', ({emoji}, user) => {
            this.onReactionCollection(emoji, user, collector, properties)});
        collector.on('end', () => {
            this.onCollectorEnd(properties);
        });
    }

    /**
     * Add reactions to the given raid message
     * @param message raid message to add reactions to
     * @param reactions Map to read reactions from
     */
    private addRaidReactions(message: Message, template: IRaidTemplate): void {
        message.react(template.primaryReact);
        template.secondaryReacts.forEach(r => {message.react(r)});
        template.additionalReacts.forEach(r => {message.react(r)});
        message.react('✅');
        message.react('❌');
    }

    /**
     * Creates the starting afk-check MessageEmbed
     * @param properties the options object to read raid information from
     * @returns a MessageEmbed containing information about the raid to use during the afk-check
     */
    private createRaidStartEmbed({template, starter, destChannel, remainingTime, raiders, raidLeaders}: RaidProperties): MessageEmbed {
        const minutes = Math.floor(remainingTime / (60*1000));
        const seconds = (remainingTime % (60*1000)) / 1000;
        return this._ClientTools.getStandardEmbed()
            .setAuthor(`${template.name} started by ${starter.displayName} in ${destChannel.name}.`, starter.user.avatarURL())
            .setDescription(`${template.description}` +
                `\n\nThe raid currently has ${raidLeaders.size} raid leaders and ${raiders.size} raiders.`)
            .setFooter(`Time Remaining: ${minutes} minutes ${seconds} seconds`);
    }

    /**
     * Creates a timed interval to update the raid message every 5 seconds with the current time remaining
     * @param properties the options object to read raid information from
     * @returns A NodeJS.Timeout object with the interval
     */
    private createUpdateInterval(properties: RaidProperties): NodeJS.Timeout {
        return setInterval(() => {
            properties.remainingTime -= properties.remainingTime - 5000 >= 0 ? 5000 : properties.remainingTime;
            properties.raidMessage.edit(this.createRaidStartEmbed(properties));
        }, 5000);
    }

    /**
     * Sends a here ping message to go with the akf check
     * @param properties the options object to read raid information from
     * @returns the Message object sent
     */
    private async sendNotifMessage({template, starter, alertChannel, idleChannel, destChannel}: RaidProperties): Promise<Message> {
        logger.debug('Sending notification message for %s\'s %s afk check', starter.displayName, template.name);
        const messageContent = `@here \`${template.name}\` started by ${starter.displayName} in ${destChannel.name}! Join \`${idleChannel.name}\` and react to join.`;
        return alertChannel.send(messageContent).then(notifMessage => {
            return notifMessage;
        }).catch(logger.error);
    }
    
    /**
     * Verifies that the given channel exists in the guild and is the correct type of channel. Sends an error message if it is not.
     * @param message message sent by user
     * @param channel channel to validate
     * @param type type of channel to validate
     * @returns whether or not the channel is valid
     */
    private verifyChannel(message: Message, channel: string, type: 'text' | 'voice'): boolean {
        const res = RolesAndChannels.getChannel(message.guild, channel, type);
        if (!res) {
            const embed = this._ClientTools.getStandardEmbed()
                .setTitle("ERROR: Invalid Arguments Given")
                .setDescription(`${channel} is not a valid ${type} channel in this server.`);
            message.channel.send(embed);
            return false;
        }
        return true;
    }

    /**
     * Verifies that all given arguments are valid for the expected format
     * @param message message sent by user
     * @param args arguments given in message with the expected format of 
     * 'raid start :templateName :alertTextChannel :idleVoiceChannel :destVoiceChannel ?:location'
     * @returns whether or not all of the arguments given are valid
     */
    private verifyArguments(message: Message, args: string[]): boolean {
        let passed = true;
        passed = passed && this.verifyChannel(message, args[3], 'text'); 
        passed = passed && this.verifyChannel(message, args[4], 'voice'); 
        passed = passed && this.verifyChannel(message, args[5], 'voice'); 
        return passed;
    }

    // TODO: Create secondary reaction confirmations message in guild
    /**
     * Starts a raid with the given arguments
     * @param message message sent by user
     * @param args arguments given in message with the expected format of
     * 'raid start :templateName :alertTextChannel :idleVoiceChannel :destVoiceChannel ?:location'
     */
    public async startRaid(message: Message, args: string[]): Promise<void> {
        if (!this.verifyArguments(message, args)) {
            logger.debug('Guild:%s|%s - User:%s|%s failed to start a raid due to invalid arguments.', message.guild.id, message.guild.name, message.author.id, message.author.username);
            return;
        }
        const raidProperties = await this.buildRaidProperties(message, args);
        raidProperties.notifMessage = await this.sendNotifMessage(raidProperties);
        raidProperties.alertChannel.send(this.createRaidStartEmbed(raidProperties)).then(raidMessage => {
            raidProperties.raidMessage = raidMessage;
            this.addRaidReactions(raidMessage, raidProperties.template);
            raidProperties.interval = this.createUpdateInterval(raidProperties);
            this.startReactionCollector(raidProperties);
        });
    }
}