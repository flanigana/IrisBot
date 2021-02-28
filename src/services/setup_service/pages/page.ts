import { Template } from '../../../models/templates/template';
import { MessageEmbed } from 'discord.js';

export class Page<E extends Template> {

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

export class DynamicPage<E extends Template> extends Page<E> {
    protected readonly _PageBuilder: (fields: Partial<E>) => Promise<MessageEmbed>;
    protected readonly _Validator: (fields: Partial<E>, res: string) => Promise<string>;
    protected _fields: Partial<E>;
    protected _status: string;

    public constructor(
        fields: Partial<E>,
        pageBuilder: (fields: Partial<E>) => Promise<MessageEmbed>,
        validator: (fields: Partial<E>, res: string) => Promise<string>
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
        return this._PageBuilder(this._fields).then((embed) => {
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
        return this._Validator(this._fields, res).then((status) => {
            this._status = status;
            return this._fields;
        });
    }
}

export class DynamicRepeatedPage<E extends Template> extends DynamicPage<E> {

    private readonly _DefaultFields: Partial<E>;

    private _allFields: Partial<E>[];
    private _position: number;

    public constructor(
        fields: Partial<E>[],
        pageBuilder: (fields: Partial<E>) => Promise<MessageEmbed>,
        validator: (fields: Partial<E>, res: string) => Promise<string>,
        defaultFields: any,
        ) {
        super(defaultFields, pageBuilder, validator);
        this._DefaultFields = { ... defaultFields };
        this._allFields = fields.length > 0 ? fields : [{ ... defaultFields }];
        this._fields = this._allFields[0];
        this._position = 0;
    }

    public get isBlank(): boolean {
        for (const field in this._DefaultFields) {
            if (this._fields[field] != this._DefaultFields[field]) {
                return false;
            }
        }
        return true;
    }
    
    public get size(): number {
        return this._allFields.length;
    }

    public get hasNext(): boolean {
        if (!this.isBlank) {
            return true;
        }
        return this._position+1 < this.size;
    }

    public get hasPrevious(): boolean {
        return this._position > 0;
    }

    public incrementSize(): void {
        this._allFields.push({ ... this._DefaultFields });
    }

    public decrementSize(): void {
        this._allFields.pop();
    }

    public nextPage(): void {
        if (this.hasNext) {
            if (this._position + 1 === this._allFields.length) {
                this.incrementSize();
            }
            ++this._position;
        }
        this._fields = this._allFields[this._position];
    }

    public previousPage(): void {
        if (this.hasPrevious) {
            --this._position;
        }
        this._fields = this._allFields[this._position];
    }

    public removeCurrentPage(): void {
        if (this.size > 1) {
            return;
        }
        this._allFields.splice(this._position, 1);
        if (this._position >= this.size) {
            this._position = this.size-1;
        }
    }

    private joinPageFields(): Partial<E> {
        let joinedFields: any = {};
        this._allFields.forEach((f) => {
            for (const field in f) {
                joinedFields[field] = (joinedFields[field] || []).concat(f[field]);
            }
        })
        return joinedFields;
    }

    public buildPage(): Promise<MessageEmbed> {
        return this._PageBuilder(this._fields).then((embed) => {
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
        return this._Validator(this._fields, res).then((status) => {
            this._status = status;
            return this.joinPageFields();
        });
    }
}