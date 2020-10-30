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
* !hc : starts a headcount

### Planned Future Updates - 
* Raid tracking used to log various raid parameters

### Change List -

#### October 39, 2020
* Adjustments / Bug Fixes
  * Fixed server owner ID retrieval when adding a new server

#### October 24, 2020
* Performance
  * Reduced the number of loaded renders to only those that are currently used.
    * This reduced start-up time by more than half (takes about <20 seconds now versus 40-60 seconds before).
    * It also cut memory usage by about half.
* Adjustments / Bug Fixes
  * Small fix when loading class skins

#### October 23, 2020
* Adjustments / Bug Fixes
  * When RealmEye goes down (returns 404 errors for many of its pages), the bot will now still be able to run all commands.
  * Error messages during this time now suggest that RealmEye may be down.
  * Upon failing to retrieve class info, the bot will now retry to retrieve the info in 10 minute intervals until successful.
  * PPE command will not display an image, but will still work without reliance on RealmEye class info if the site is down.

#### October 6, 2020
* RealmEye Info
  * Can now display a user's RealmEye info by using "!realmeye @user"

#### September 18, 2020
* Configuration
  * Command prefix options have been restricted to a list of potential options. There should still be enough to be sure there are no conflicting prefixes with any other bot you may have.
  * This list includes !, -, ., +, ?, $, >, /, ;, *, s!, =, m! and !!
* Verification
  * Automatically verifies user in queued servers upon IGN verification.
  * Before, the user would have to go back to the original channel and reuse the verify command to be verified. This is now done automatically after IGN verification.
* Adjustments / Bug Fixes
  * New roles are now correctly included in the server verification message. Before, it would only show old roles and none of the newly assigned ones. New ones should be showing up now as well.

#### August 7, 2020
* Headcount command added

#### July 17, 2020
* RealmEye Info
  * Reduced number of requests sent during RealmEye info retrieval. Now only makes the necessary requests what is needed.
* Parsing
  * Increased rate of parsing due to the decrease in number of requests

#### July 6-16, 2020
* Parsing
  * Added a parser, but only limited servers have access to it
* Adjustments / Bug Fixes
  * Various small backend changes

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