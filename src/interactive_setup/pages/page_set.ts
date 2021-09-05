import { MessageEmbed } from 'discord.js';
import { DataModel } from '../../models/interfaces/data_model';
import { DynamicConditionalPage, Page } from './page';

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
		return this.recursivePageCheck(this._position - 1, -1);
	}

	public get hasNext(): boolean {
		return this.recursivePageCheck(this._position + 1, 1);
	}

	private recursivePageCheck(pos: number, direction: 1 | -1): boolean {
		if (pos < 0 || pos >= this._pages.length) {
			return false;
		}
		const page = this._pages[pos];
		if (!(page instanceof DynamicConditionalPage)) {
			return true;
		}
		if (page.conditionMet()) {
			return true;
		} else {
			return this.recursivePageCheck(pos + direction, direction);
		}
	}

	private recursivePageTurn(direction: 1 | -1): void {
		if (this._position + direction < 0 || this._position + direction >= this._pages.length) {
			return;
		}
		this._position += direction;
		const page = this._pages[this._position];
		if (!(page instanceof DynamicConditionalPage)) {
			return;
		}
		if (page.conditionMet()) {
			return;
		} else {
			this.recursivePageTurn(direction);
		}
	}

	public async getCurrentPageView(): Promise<MessageEmbed> {
		if (this._pages.length === 0) {
			return null;
		}
		return this._pages[this._position].getPageView();
	}

	public async getPreviousPageView(): Promise<MessageEmbed> {
		this.recursivePageTurn(-1);
		return this.getCurrentPageView();
	}

	public async getNextPageView(): Promise<MessageEmbed> {
		this.recursivePageTurn(1);
		return this.getCurrentPageView();
	}

	public async validate(res: string): Promise<Partial<E>> {
		return this.currentPage.validate(res).then((fields: Partial<E>) => {
			return Object.assign(this._template, fields) as Partial<E>;
		});
	}

	public addPage(page: Page<E>): void {
		this._pages.push(page);
	}
}
