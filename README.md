# IrisBot
A Discord bot for managing Realm of the Mad God servers. Generally used for server verification and raid management.

### Commands -
* !help : shows a list of commands
* !config : used to configure your server
* !verification : used to configure verification for server
* !raid : used to access the raid manager
* !realmeye : lists all characters and account info available on RealmEye for a player
* !ppe : gives a random class name as a suggestion for a new ppe character

### Verification Commands -
* !verification list : used to list the names of all existing verification templates
* !verification create : begins creations of a new verification template
* !verification edit : edits an existing verification template
* !verification delete : deletes the verification template with the given name
* !manualVerify : allows mods to manually verify users who don't meet requirements
* !unverify : unverifies a verified user

### Raid Commands -
* !raid config : used to configure settings used by the raid manager
* !raid shorthand : used to create shorter raid commands for more efficient raid starts
* !raid list : used to list the names of all existing raid templates
* !raid create : begins creations of a new raid template
* !raid edit : edits an existing raid template
* !raid delete : deletes the raid template with the given name
* !raid start : starts a raid using the given raid template

### Coming Soon - 
* Raid tracking used to log various raid parameters

### Change List -
#### July 5, 2020
* Verification
  * Added dungeon completions to verification templates and checks
  * Added reasons that user failed verification in message to guild
  * Now sends a message with verification instructions to the verification channel after template creation/update
* Adjustments / Bug Fixes
  * Fixed a bug that happened during raid shorthand creation/update
  * Fixed some minor message clarity issues such as in the message sent to guild verification log upon a user's successful verification

#### July 4, 2020
* Completely Reworked Verification
  * Verify IGN with bot and only type !verify in a verification channel to verify from then on.
  * Use !updateIGN if you need to update your IGN after verification
  * Verification templates are new. Similar to raid templates and very similar setup. Make a new verification template using !verification create (edit and delete using !verification edit/delete)
  * Roles that have bot mod permissions can change these verification settings.
  * Bot mods can also manually verify people using the command !manualVerify
  * Users can now be unverified which will remove them from the list of verified users for the template and remove the role given by that template.
* Changed Server Settings
  * Servers settings now only include admin roles, mod roles, and the bot prefix
  * Admin roles allow users to have full access to all bot settings including changing the server settings and creating/modifying raid templates
  * Mod roles allow users to have permissions for verification, including creating/modifying verification templates, manual verification, and manually unverifying someone
* Bug Fixes
  * Cleared up a few help commands to be more accurate
  * Fixed the ppe command to be functional again
  * Fixed a bug during verification where 8/8s would be incorrectly counted and sometimes would not count as 6/8s. Now, if a user needs 2 6/8s and 2 8/8s for verification, anything between 2 6/8s and 2 8/8s to 4 8/8s should pass verification correctly