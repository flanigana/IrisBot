import { MessageEmbed } from "discord.js";
import { injectable } from "inversify";
import { IVerificationTemplate } from "../models/verification_template";
import { PageSet } from "./pages/page_set";
import { SetupService } from "./setup_service";

@injectable()
export class VerificationTemplateManagerService extends SetupService<IVerificationTemplate> {
    protected save(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    protected getEndPage(finished?: boolean): MessageEmbed {
        throw new Error("Method not implemented.");
    }
    protected createPageSet(): PageSet<IVerificationTemplate> {
        throw new Error("Method not implemented.");
    }
    protected get isFinished(): boolean {
        throw new Error("Method not implemented.");
    }
    
}