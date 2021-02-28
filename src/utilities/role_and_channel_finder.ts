import { Guild, Channel, Role } from 'discord.js';

/**
 * Module with functions used to retrieve Channel and Role objects within a Discord Guild
 */
export module RolesAndChannels {

    /**
     * Returns a Channel of a Guild given its id and optionally its type
     * @param guild Discord Guild containing the Channel
     * @param channelId id of the Channel
     */
    export function getChannelById(guild: Guild, channelId: string, type?: 'text' | 'voice'): Channel  {
        let channel = guild.channels.cache.get(channelId);
        return channel.type === type ? channel : undefined;
    };
    
    /**
     * Returns a Role of a Guild given its id
     * @param guild Discord Guild containing the Role
     * @param roleId id of the Role
     */
    export function getRoleById(guild: Guild, roleId: string): Role {
        return guild.roles.cache.get(roleId);
    };
    
    /**
     * Returns a Channel of a Guild given its name and optionally its type
     * @param guild Discord Guild containing the Channel
     * @param channelName name of the Channel
     * @param type the type of the Channel
     */
    export function getChannelByName(guild: Guild, channelName: string, type?: 'text' | 'voice'): Channel {
        return guild.channels.cache.find((channel) => {
            if (channel.name.toLowerCase() !== channelName.toLowerCase()) {
                return false;
            }
            if (type && channel.type !== type) {
                return false;
            }
            return true;
        });
    };
    
    /**
     * Returns a Role of a Guild given its name
     * @param guild Discord Guild containing the Role
     * @param roleName name of the Role
     */
    export function getRoleByName(guild: Guild, roleName: string): Role {
        return guild.roles.cache.find((role) => (role.name.toLowerCase() === roleName.toLowerCase()));
    };
    
    /**
     * Returns a Channel of a Guild given either its <#id> form or its name and optionally its type
     * @param guild Discord Guild containing the Channel
     * @param channel identifier for the Channel
     * @param type the type of the Channel
     */
    export function getChannel(guild: Guild, channel: string, type?: 'text' | 'voice'): Channel {
        const channelRegex = new RegExp(/(<#\d*>)/g);
        if (channelRegex.test(channel)) {
            return getChannelById(guild, channel.replace(/^<#|>$/g, ''), type);
        } else {
            return getChannelByName(guild, channel, type);
        }
    };
    
    /**
     * Returns a Role of a Guild given either its <@&id> form or its name
     * @param guild Discord Guild containing the Role
     * @param role identifier for the Role
     */
    export function getRole(guild: Guild, role: string): Role {
        const roleRegex = new RegExp(/(<@&\d*>)/g);
        if (roleRegex.test(role)) {
            return getRoleById(guild, role.replace(/^<@&|>$/g, ''));
        } else {
            return getRoleByName(guild, role);
        }
    };
}