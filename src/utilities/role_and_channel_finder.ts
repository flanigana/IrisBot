import { Guild, Channel, Role } from 'discord.js';
import { StringUtils } from './string_utils';

/**
 * Module with functions used to retrieve Channel and Role objects within a Discord Guild
 */
export abstract class RolesAndChannels {

    /**
     * Returns a Channel of a Guild given its id and optionally its type
     * @param guild Discord Guild containing the Channel
     * @param channelId id of the Channel
     */
    public static getChannelById(guild: Guild, channelId: string, type?: 'text' | 'voice'): Channel  {
        let channel = guild.channels.cache.get(channelId);
        return channel.type === type ? channel : undefined;
    };
    
    /**
     * Returns a Role of a Guild given its id
     * @param guild Discord Guild containing the Role
     * @param roleId id of the Role
     */
    public static getRoleById(guild: Guild, roleId: string): Role {
        return guild.roles.cache.get(roleId);
    };
    
    /**
     * Returns a Channel of a Guild given its name and optionally its type
     * @param guild Discord Guild containing the Channel
     * @param channelName name of the Channel
     * @param type the type of the Channel
     */
    public static getChannelByName(guild: Guild, channelName: string, type?: 'text' | 'voice'): Channel {
        return guild.channels.cache.find((channel) => {
            if (StringUtils.equalsIgnoreCase(channel.name, channelName)) {
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
    public static getRoleByName(guild: Guild, roleName: string): Role {
        return guild.roles.cache.find(role => StringUtils.equalsIgnoreCase(role.name, roleName));
    };
    
    /**
     * Returns a Channel of a Guild given either its <#id> form or its name and optionally its type
     * @param guild Discord Guild containing the Channel
     * @param channel identifier for the Channel
     * @param type the type of the Channel
     */
    public static getChannel(guild: Guild, channel: string, type?: 'text' | 'voice'): Channel {
        const channelRegex = new RegExp(/(<#\d*>)/g);
        if (channelRegex.test(channel)) {
            return this.getChannelById(guild, channel.replace(/^<#|>$/g, ''), type);
        } else {
            return this.getChannelByName(guild, channel, type);
        }
    };
    
    /**
     * Returns a Role of a Guild given either its <@&id> form or its name
     * @param guild Discord Guild containing the Role
     * @param role identifier for the Role
     */
    public static getRole(guild: Guild, role: string): Role {
        const roleRegex = new RegExp(/(<@&\d*>)/g);
        if (roleRegex.test(role)) {
            return this.getRoleById(guild, role.replace(/^<@&|>$/g, ''));
        } else {
            return this.getRoleByName(guild, role);
        }
    };

    /**
     * Returns an array of Roles of a Guild given either their <@&id> forms or their names
     * If the role is not found, it is not added to the array. Because of this, array length
     * can be shorter than the original length of the given array.
     * @param guild Discord Guild containing the Role
     * @param role array of identifiers for the Roles
     */
    public static getRoles(guild: Guild, ...roles: string[]): Role[] {
        const foundRoles: Role[] = [];
        roles.forEach(r => {
            const foundRole = this.getRole(guild, r);
            if (foundRole) {
                foundRoles.push(foundRole);
            }
        });
        return foundRoles;
    }

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
    public static getUpdatedList(guild: Guild, orig: string[], args: string[], type: 'role' | 'channel'): string[] {
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
                arg = this.getRole(guild, arg)?.toString();
            } else {
                arg = this.getChannel(guild, arg)?.toString();
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