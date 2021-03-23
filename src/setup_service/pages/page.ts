import { DataModel } from '../../models/interfaces/data_model';
import { MessageEmbed } from 'discord.js';

export class Page<E extends DataModel> {

    private readonly _Page: MessageEmbed;

    public constructor(
        page: MessageEmbed
    ) {
        this._Page = page;
    }

    public async getPageView(): Promise<MessageEmbed> {
        return Promise.resolve(this._Page);
    }

    public async validate(res: string): Promise<Partial<E>> {
        return null;
    }
}

export class DynamicPage<E extends DataModel> extends Page<E> {

    protected readonly _PageBuilder: ((fields: Partial<E>) => MessageEmbed) | ((fields: Partial<E>) => Promise<MessageEmbed>);
    protected readonly _Validator: ((fields: Partial<E>, res: string) => string) | ((fields: Partial<E>, res: string) => Promise<string>);
    protected _fields: Partial<E>;
    protected _status: string;

    public constructor(
        fields: Partial<E>,
        pageBuilder: ((fields: Partial<E>) => MessageEmbed) | ((fields: Partial<E>) => Promise<MessageEmbed>),
        validator?: ((fields: Partial<E>, res: string) => string) | ((fields: Partial<E>, res: string) => Promise<string>)
    ) {
        super(null);
        this._PageBuilder = pageBuilder;
        this._Validator = validator;
        this._fields =  fields;
    }

    public async getPageView(): Promise<MessageEmbed> {
        return this.buildPage();
    }

    public buildPage(): Promise<MessageEmbed> {
        return Promise.resolve(this._PageBuilder(this._fields)).then((embed) => {
            if (this._status && this._status !== '') {
                embed.addField('Status', this._status);
                this._status = '';
            }
            return embed;
        });
        
    }

    public async validate(res: string): Promise<Partial<E>> {
        if (!this._Validator) {
            return Promise.resolve(this._fields);
        }
        return Promise.resolve(this._Validator(this._fields, res)).then((status) => {
            this._status = status;
            return this._fields;
        });
    }
}

export class DynamicConditionalPage<E extends DataModel> extends DynamicPage<E> {

    private readonly _Condition: () => boolean;

    public constructor(
        condition: () => boolean,
        fields: Partial<E>,
        pageBuilder: ((fields: Partial<E>) => MessageEmbed) | ((fields: Partial<E>) => Promise<MessageEmbed>),
        validator?: ((fields: Partial<E>, res: string) => string) | ((fields: Partial<E>, res: string) => Promise<string>)
    ) {
        super(fields, pageBuilder, validator);
        this._Condition = condition;
    }

    public conditionMet(): boolean {
        return this._Condition();
    }
}