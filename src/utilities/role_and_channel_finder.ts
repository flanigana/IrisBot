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

    /**
     * Creates a merged list of Roles or Channels from an original list and a new list of arguments.
     * If an argument is preceded by a +, it will add that Role or Channel to the list.
     * If an argument is preceded by a -, it will remove that Role or Channel from the original list.
     * If no +'s or -'s are included, then none of the original Roles or Channels will be kept and the list returned will only contain the ones in the arguments.
     * @param guild Discord Guild containing Roles and Channels
     * @param orig original list of Roles or Channels
     * @param args list of arguments with Roles or Channels
     * @param type whether the arguments expected are of type 'role' or 'channel'
     * @returns a merged or new list depending on the arguments contained
     */
    export function getUpdatedList(guild: Guild, orig: string[], args: string[], type: 'role' | 'channel'): string[] {
        const origList = new Set<string>(orig);
        const newOnly = new Set<string>();
        let reset = true;
        for (let arg of args) {
            let mode = '';
            if (arg.startsWith('-')) {
                mode = '-';
                reset = false;
                arg = arg.substr(1);
            } else if (arg.startsWith('+')) {
                mode = '+';
                reset = false;
                arg = arg.substr(1);
            }
            if (type === 'role') {
                arg = getRole(guild, arg)?.toString();
            } else {
                arg = getChannel(guild, arg)?.toString();
            }
            if (arg) {
                if (mode === '-') {
                    origList.delete(arg);
                } else {
                    newOnly.add(arg);
                }
            }
        }

        if (!reset) {
            newOnly.forEach(r => origList.add(r));
            return Array.from(origList);
        } else {
            return Array.from(newOnly);
        }
    }
}