# IrisBot
A Discord bot for managing Realm of the Mad God servers.

### Commands -
* !raid : used to access the raid manager.
* !config : used to configure your server.
* !verify : used to verify for server.
* !characters : lists all characters and account info available on RealmEye.
* !ppe : gives a random class name as a suggestion for a new ppe character.

### Config Commands -
* !config prefix : used to update bot's command prefix.
* !config list : used to list the current server configuration.
* !config permissions : used to set which roles can change server configuration (Note: all server admins can use config commands).
* !config guildName : used to change guild name associated with server. This is needed for verification.
* !config reqs : used to set verification requirements for server.
* !config roles : used to give roles to newly verified members by using guild rank found on RealmEye.
* !config allMembersRole : used to assign a common role to all verified members. This can be used in addition to guild rank roles.
* !config nonMember : used to allow or deny non-guild-members to verify with the server. Useful if you want applicants to verify before being added to guild.
* !config verificationChannel : used to change server's verification channel and the verification log channel.

### Raid Commands -
* !raid list : used to list the names of all existing raid templates.
* !raid create : begins creations of a new raid template
* !raid edit : edits an existing raid template
* !raid delete : deletes the template with the given name
* !raid start : starts a raid using the given raid template

### Coming Soon - 
* Auto updating server roles based on guild rank