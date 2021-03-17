import { MessageEmbed } from 'discord.js';
import { DataModel } from '../../models/interfaces/data_model';
import { DynamicRepeatedPage, Page } from './page';

export class PageSet<E extends DataModel> {
    
    private _pages: Page<E>[];
    private _position: number;
    private _template: Partial<E>;

    public constructor(template: Partial<E>) {
        this._pages = [];
        this._position = 0;
        this._template = template;
    }

    private get currentPage(): Page<E> {
        if (this._pages.length === 0) {
            return null;
        }
        return this._pages[this._position];
    }

    public get hasPrevious(): boolean {
        const currentPage = this._pages[this._position];
        if (currentPage instanceof DynamicRepeatedPage) {
            const dynamicPage = currentPage as DynamicRepeatedPage<E>;
            if (dynamicPage.hasPrevious) {
                return true;
            }
        }
        if (this._position === 0) {
            return false;
        }
        return true;
    }

    public get hasNext(): boolean {
        const currentPage = this._pages[this._position];
        if (currentPage instanceof DynamicRepeatedPage) {
            const dynamicPage = currentPage as DynamicRepeatedPage<E>;
            if (dynamicPage.hasNext) {
                return true;
            }
        }
        if (this._position+1 >= this._pages.length) {
            return false;
        }
        return true;
    }

    public async getCurrentPageView(): Promise<MessageEmbed> {
        if (this._pages.length === 0) {
            return null;
        }
        return this._pages[this._position].getPageView();
    }

    public async getPreviousPageView(): Promise<MessageEmbed> {
        const currentPage = this._pages[this._position];
        if (currentPage instanceof DynamicRepeatedPage) {
            const dynamicPage = currentPage as DynamicRepeatedPage<E>;
            if (dynamicPage.hasPrevious) {
                dynamicPage.previousPage();
                return this.getCurrentPageView();
            }
        }
        if (this.hasPrevious) {
            --this._position;
        }
        return this.getCurrentPageView();
    }

    public async getNextPageView(): Promise<MessageEmbed> {
        const currentPage = this._pages[this._position];
        if (currentPage instanceof DynamicRepeatedPage) {
            const dynamicPage = currentPage as DynamicRepeatedPage<E>;
            if (dynamicPage.hasNext) {
                dynamicPage.nextPage();
                return this.getCurrentPageView();
            }
        }
        if (this.hasNext) {
            ++this._position;
        }
        return this.getCurrentPageView();
    }

    public async validate(res: string): Promise<Partial<E>> {
        return this.currentPage.validate(res).then((fields: Partial<E>) => {
            return Object.assign(this._template, fields) as Partial<E>;
        });
    }

    public addPage(page: Page<E>) {
        this._pages.push(page);
    }
}