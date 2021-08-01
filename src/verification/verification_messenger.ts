import { Guild, TextChannel, User } from "discord.js";
import { inject, injectable } from "inversify";
import { IVericode } from "../models/vericode";
import { UserData } from "../realmeye/realmeye_types";
import { TYPES } from "../types";
import { ClientTools, EmbedField } from "../utilities/client_tools";

@injectable()
export class VerificationMessenger {

    private readonly _ClientTools: ClientTools;

    public constructor(
        @inject(TYPES.ClientTools) clientTools: ClientTools
    ) {
        this._ClientTools = clientTools;
    }

    public sendTemplateAlreadyVerifiedMessageToUser(user: User, guild: Guild, channel: TextChannel): void {
        user.send(
            this._ClientTools.getStandardEmbed()
                .setTitle('Already Verified')
                .setDescription(`You are already verified for\n**${guild.name}**:${channel}.`)
        );
    }

    public sendGeneralVerificationFailureToUser(user: User, ...reasons: EmbedField[]): void {
        let embed = this._ClientTools.getStandardEmbed()
            .setTitle('Verification Error')
            .setDescription('There was an error encountered during verification.');
        this._ClientTools.addFieldsToEmbed(embed, ...reasons);
        user.send(embed);
    }

    public sendIgnVerificationStartMessageToUser(user: User, vericode: string): void {
        user.send(
            this._ClientTools.getStandardEmbed()
                .setTitle('IGN Verification Started')
                .setDescription('Thank you for beginning your verification process with Iris Bot!.' +
                    ' Once this verification is complete, your IGN will be saved for future use.')
                .addFields(
                    {name: 'Step 1', value: `[Login to your RealmEye account](https://www.realmeye.com/log-in) and put \`${vericode}\` in any part of your description.`},
                    {name: 'Step 2', value: 'Come back here and reply with \`!verify :ign\`.'},
                    {name: 'Step 3', value: 'Once completed successfully, you\'ll receive a message verifying completion!'}
                )
        )
    }

    public sendInvalidIgnVerificationCommandToUser(user: User): void {
        user.send(
            this._ClientTools.getStandardEmbed()
                .setTitle('Invalid Command')
                .setDescription('In order to verify your IGN, you need to include your IGN in the command, such as \`!verify :ign\`.\n' +
                    'If you wish to add or update your IGN, use the command \`!updateIGN\` and follow the steps.')
        );
    }

    public sendIgnVerificationSuccessToUser(user: User, userData: UserData): void {
        user.send(
            this._ClientTools.getStandardEmbed()
                .setTitle('Verification Success')
                .setDescription(`Congratulations! you have been successfully verified as [${userData.name}](${userData.realmEyeUrl}) with Iris Bot!\n` +
                    'You can now verify in any verification channel using this bot.')
                .addField('Updating Your IGN', 'If you ever need to update your IGN, just type \`!updateIGN\` in this DM channel'
                    + ' or any verification channel used by Iris Bot')
        );
    }
}