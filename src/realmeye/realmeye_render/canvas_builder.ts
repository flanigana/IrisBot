import * as Canvas from 'canvas';
import { Character, EquipmentSet, Item } from '../realmeye_data/realmeye_data_types';
import { RealmeyeRenderService } from './realmeye_render_service';

/**
 * A class that uses the `Canvas` library in order to create dynamic `Canvas`s and `Buffer`s
 * that visualize game data.
 * NOTE: This class is visually (ironic) kind of a mess, but it's really hard to make things incredibly clean with
 * all of these colors, pixel values, spacing between elements, and such
 */
export abstract class CanvasBuilder {
	// if false, private characters will be filtered out before visualization is created
	private static readonly _ENABLE_PRIVATE_CHARACTERS = true;
	// if true, the base class image will be added to the right of the character skin for clarity
	private static readonly _ENABLE_BASE_CLASS = true;
	// if true, the character's pet will be added to the left of the character skin
	private static readonly _ENABLE_PETS = true;
	// NOT SUPPORTED BY REALMEYE CURRENTLY if true, backpacks will be included at the end of character equipment
	private static readonly _ENABLE_BACKPACKS = false;

	/**
	 * Creates a `Buffer` containing a character list visualization for the given `Character`s.
	 * This works with a player's character list as well as a guild's top characters list.
	 * @param characters list of `Character`s to display in visualization
	 * @param type type of character list (guild = guild's top players, player = player's characters)
	 * @returns `Buffer` containing a character list visualization
	 */
	static async buildCharacterDisplayBuffer(characters: Character[], type: 'player' | 'guild'): Promise<Buffer> {
		const maxCharacters = 10;
		if (!CanvasBuilder._ENABLE_PRIVATE_CHARACTERS) {
			characters = characters.filter((c) => c.private);
		}
		if (characters.length > maxCharacters) {
			characters = characters.slice(0, maxCharacters);
		}

		const settings: Partial<Settings> = {
			primarySize: 75,
			borderWidth: 5,
			borderColor: '#53538a',
			primaryColor: '#323245',
			secondaryColor: 'rgba(83, 83, 138, 0.3)',
			font: 'sans-serif',
			fontColor: '#ffffff',
			margin: {
				left: 6,
				right: 6,
				top: 4,
				bottom: 4,
			},
			padding: {
				left: 2,
				right: 2,
				top: 2,
				bottom: 2,
			},
		};
		settings.fontSize = (3 / 4) * settings.primarySize;
		settings.secondarySize = (3 / 4) * settings.primarySize;

		const columnWidths = CanvasBuilder.findCharacterColumnWidths(characters, type, settings);
		settings.width = columnWidths.total;
		settings.rowHeight = settings.margin.top + settings.primarySize + settings.margin.bottom;
		settings.height = characters.length * settings.rowHeight;

		const canvas = Canvas.createCanvas(settings.width, settings.height);
		const ctx = canvas.getContext('2d');

		// background
		ctx.fillStyle = settings.primaryColor;
		ctx.fillRect(0, 0, settings.width, settings.height);

		for (let i = 0; i < characters.length; i++) {
			settings.fillColor = i % 2 == 0 ? settings.primaryColor : settings.secondaryColor;
			const characterRow = await CanvasBuilder.buildCharacterRow(characters[i], columnWidths, settings);
			ctx.drawImage(characterRow, 0, settings.rowHeight * i, settings.width, settings.rowHeight);
		}

		return CanvasBuilder.addBorder(canvas, settings).toBuffer('image/png');
	}

	/**
	 * Calculates the neccessary pixel widths of each column for a character visualization as well as
	 * the total width of all columns
	 * @param characters list of `Character`s included in visualization
	 * @param type player or guild type visualization
	 * @param settings visualization settings
	 * @returns a `CharacterColumnWidths` with the pixel widths of each column as well as the total width that includes all columns
	 */
	private static findCharacterColumnWidths(
		characters: Character[],
		type: 'player' | 'guild',
		{
			font = 'sans-serif',
			fontSize = 12,
			primarySize = 50,
			secondarySize = 35,
			margin = { left: 2, right: 2, top: 2, bottom: 2 },
		}: Partial<Settings>
	): CharacterColumnWidths {
		const canvas = Canvas.createCanvas(1000, 1000);
		const ctx = canvas.getContext('2d');
		ctx.font = `${fontSize}px ${font}`;

		const widths: Partial<CharacterColumnWidths> = {};

		if (type === 'guild') {
			widths.name = Math.max(
				...characters
					.map((c) => c.owner.name)
					.map((n) => {
						ctx.fillText(n, 0, 0);
						return ctx.measureText(n).width;
					})
			);
			widths.name += margin.left + margin.right;
		} else {
			widths.name = 0;
		}

		ctx.fillText('8/8', 0, 0);
		widths.stats = margin.left + ctx.measureText('8/8').width + margin.right;

		widths.petPlayer = margin.left + primarySize + margin.right;
		if (type === 'player' && CanvasBuilder._ENABLE_PETS) {
			widths.petPlayer += secondarySize;
		}
		if (CanvasBuilder._ENABLE_BASE_CLASS) {
			widths.petPlayer += secondarySize;
		}

		let equipCount = 4;
		if (type === 'player' && CanvasBuilder._ENABLE_BACKPACKS) {
			++equipCount;
		}
		widths.equipment = margin.left + equipCount * primarySize + margin.right;

		widths.fame = margin.left + primarySize + margin.right;
		widths.fame += Math.max(
			...characters
				.map((c) => c.fame)
				.map((f) => {
					ctx.fillText(f.toString(), 0, 0);
					return ctx.measureText(f.toString()).width;
				})
		);

		widths.total = widths.name + widths.stats + widths.petPlayer + widths.equipment + widths.fame;
		return widths as CharacterColumnWidths;
	}

	/**
	 * Adds a border with the given width and color to the given `Canvas` image
	 * @param mainCanvas `Canvas` to add border to
	 * @param settings settings to use for border
	 * @returns a new `Canvas` object with an added border
	 */
	private static addBorder(
		mainCanvas: Canvas.Canvas,
		{ borderWidth = 1, borderColor = '#000000' }: Partial<Settings>
	): Canvas.Canvas {
		const bordered = Canvas.createCanvas(mainCanvas.width + borderWidth * 2, mainCanvas.height + borderWidth * 2);
		const ctx = bordered.getContext('2d');
		ctx.fillStyle = borderColor;
		ctx.fillRect(0, 0, bordered.width, bordered.height);
		ctx.drawImage(mainCanvas, borderWidth, borderWidth, mainCanvas.width, mainCanvas.height);
		return bordered;
	}

	/**
	 * Builds a `Canvas` containing a visualization for the given `Character` that can include:
	 * owner name, maxed stats /8, pet, skin, base class skin, equipment, backpack, and fame
	 * NOTE: this could potentially be broken down into more methods, but may not clean things up considering
	 * many conditional renderings and specific values needed for placement.
	 * @param character `Character` to build visualization from
	 * @param columnWidths `CharacterColumnWidths` to use in visualization
	 * @param settings settings to use for character row
	 * @returns a `Canvas` containing the visualization for the given `Character`
	 */
	private static async buildCharacterRow(
		character: Character,
		columnWidths: CharacterColumnWidths,
		settings: Partial<Settings>
	): Promise<Canvas.Canvas> {
		const { width, rowHeight, primarySize, secondarySize, fillColor, font, fontSize, fontColor, margin, padding } =
			settings;
		const canvas = Canvas.createCanvas(width, rowHeight);
		const ctx = canvas.getContext('2d');

		if (fillColor) {
			ctx.fillStyle = fillColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}

		ctx.font = `${fontSize}px ${font}`;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillStyle = fontColor;

		let xOffset = 0;
		// owner name (only if a guild character)
		if (character.guildCharacter) {
			ctx.fillText(character.owner?.name ?? 'Private', margin.left + xOffset, margin.top);
			xOffset += columnWidths.name;
		}

		// character stats X/8
		ctx.fillText(character.maxedStats, margin.left + xOffset, margin.top);
		xOffset += columnWidths.stats;

		// add margin ahead of time for conditional pet
		xOffset += margin.left;
		// character pet
		if (!character.guildCharacter && CanvasBuilder._ENABLE_PETS) {
			const petGap = primarySize - secondarySize;
			const petImage = await RealmeyeRenderService.getRenderByRef(character?.pet, true);
			ctx.drawImage(
				CanvasBuilder.createImageFromBuffer(petImage.data),
				xOffset + padding.left,
				margin.top + padding.top + petGap,
				secondarySize - (padding.left + padding.right),
				secondarySize - (padding.top + padding.bottom)
			);
			xOffset += secondarySize;
		}

		// character skin
		const skinImage = !character.private
			? await RealmeyeRenderService.getRenderByRef(
					`${character.model['data-class']}:${character.model['data-skin']}`,
					true
			  )
			: await RealmeyeRenderService.getRenderByName(`Classic ${character.class} Silhouette`, true);
		ctx.drawImage(
			CanvasBuilder.createImageFromBuffer(skinImage.data),
			xOffset + padding.left,
			margin.top + padding.top,
			primarySize - (padding.left + padding.right),
			primarySize - (padding.top + padding.bottom)
		);
		xOffset += primarySize;

		// base class image
		if (CanvasBuilder._ENABLE_BASE_CLASS) {
			const gap = primarySize - secondarySize;
			const baseClassImage = await RealmeyeRenderService.getRenderByName(`Classic ${character.class}`, true);
			ctx.drawImage(
				CanvasBuilder.createImageFromBuffer(baseClassImage.data),
				xOffset + padding.left,
				margin.top + padding.top + gap,
				secondarySize - (padding.left + padding.right),
				secondarySize - (padding.top + padding.bottom)
			);
			xOffset += secondarySize;
		}

		xOffset += margin.right;

		// character equipment
		const charEquip: EquipmentSet = character.equipment;
		const equipment: Item[] = [charEquip?.weapon, charEquip?.ability, charEquip?.armor, charEquip?.ring];
		if (!character.guildCharacter && CanvasBuilder._ENABLE_BACKPACKS) {
			equipment.push(charEquip?.backpack);
		}
		// only add left margin before first item
		xOffset += margin.left;
		for (const item of equipment) {
			const itemImage = await RealmeyeRenderService.getRenderByName(item?.name, true);
			ctx.drawImage(
				CanvasBuilder.createImageFromBuffer(itemImage.data),
				xOffset + padding.left,
				margin.top + padding.top,
				primarySize - (padding.left + padding.right),
				primarySize - (padding.top + padding.bottom)
			);
			xOffset += primarySize;
		}
		xOffset += margin.right;

		// fame icon
		const fameImage = await RealmeyeRenderService.getRenderByName('Fame Icon', true);
		ctx.drawImage(
			CanvasBuilder.createImageFromBuffer(fameImage.data),
			margin.left + xOffset,
			margin.top,
			primarySize,
			primarySize
		);
		xOffset += margin.left + primarySize;

		// fame text
		ctx.fillText(`${!character.private ? character.fame : '???'}`, xOffset, margin.top);

		return canvas;
	}

	private static createImageFromBuffer(buffer: Buffer): Canvas.Image {
		const image = new Canvas.Image();
		image.src = buffer;
		return image;
	}
}

type Settings = {
	width: number;
	rowHeight: number;
	height: number;
	borderWidth: number;
	borderColor: string;
	primaryColor: string;
	secondaryColor: string;
	primarySize: number;
	secondarySize: number;
	fillColor: string;
	font: string;
	fontColor: string;
	fontSize: number;
	margin: Partial<MarginSettings>;
	padding: Partial<PaddingSettings>;
};

type MarginSettings = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

type PaddingSettings = {
	[key in keyof MarginSettings]: number;
};

type CharacterColumnWidths = {
	name: number;
	stats: number;
	petPlayer: number;
	equipment: number;
	fame: number;
	total: number;
};
