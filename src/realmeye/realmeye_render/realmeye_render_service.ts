import sharp, { Sharp } from 'sharp';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../types';
import { RenderType, RenderDefinition, RenderDefinitionMap, RenderGroup } from './realmeye_render_types';
import { InitializationSettings, RealmeyeService } from '../realmeye_service';
import { RealmeyeDataService } from '../realmeye_data/realmeye_data_service';
import { RenderService } from '../../services/render_service';
import { Status } from '../../utils/status';
import Logger from '../../utils/logging';
import { IRender } from '../../models/render';
import { RealmEyeGuildData, RealmEyePlayerData } from '../realmeye_data/realmeye_data_types';
import { CanvasBuilder } from './canvas_builder';
import { RenderDoesNotExistError } from './render_does_not_exist_error';

/**
 * Responsible for loading all render images into the database and providing access to them
 */
@injectable()
export class RealmeyeRenderService extends RealmeyeService {
	static readonly _RENDER_DEFINITION_URL = `${RealmeyeRenderService._BASE_REALMEYE_URL}/s/e0/js/definition.js`;
	static readonly _ITEM_RENDER_URL = `${RealmeyeRenderService._BASE_REALMEYE_URL}/s/e0/css/renders.png`;
	static readonly _CLASS_SKINS_RENDER_URL = `${RealmeyeRenderService._BASE_REALMEYE_URL}/s/eb/img/sheets.png`;
	static readonly _STAR_RENDER_URL = `${RealmeyeRenderService._BASE_REALMEYE_URL}/s/e0/img/stars-transparent.png`;
	static readonly _FAME_RENDER_URL = 'https://i.imgur.com/5Un4UtF.png';

	/**
	 * If _FORCE_UPDATE = false, the loaded render will be checked against the one in the DB
	 * of the same RenderGroup. If it is equal (using Buffer.equals()), the loading of definitions
	 * and the parsing/saving of all renders in that RenderGroup will be skipped as they are considered
	 * up to date.
	 * If _FORCE_UPDATE = true, renders will be updated even if they are considered up to date.
	 * This is best used when a data-format change has been made in code.
	 */
	private static readonly _FORCE_UPDATE = false;

	/**
	 * Use the following two configurations to configure the way that the ITEMS renders load.
	 * The _ITEM_RENDER_TYPE_LIST is an array containing all render types to either include or skip
	 * based on the _ITEM_RENDER_LOADING_MODE.
	 * If the MODE is set to 'skip' and the TYPE_LIST is empty, all renders will be included
	 * If the MODE is set to 'include' and the TYPE_LIST is empty, no renders will be inluded
	 */
	private static readonly _ITEM_RENDER_LOADING_MODE: 'include' | 'skip' = 'skip';
	private static readonly _ITEM_RENDER_TYPE_LIST: Set<RenderType> = new Set([]);

	private static _renderService: RenderService;
	private static _uninitializedRenderGroups: Set<string> = new Set(Object.keys(RenderGroup));

	public constructor(@inject(TYPES.RenderService) renderService: RenderService) {
		super();
		this.renderService = renderService;
	}

	private set renderService(renderService: RenderService) {
		if (RealmeyeRenderService._renderService) {
			return;
		}
		RealmeyeRenderService._renderService = renderService;
	}

	/**
	 * Attempts to initialize the RealmEyeRenderService by loading all renders and their definitions
	 * into the database for use throughout the application
	 * @param initializationSettings settings to use for initialization
	 * @returns a `Status` with the outcome of the initialization
	 */
	static async initialize(initializationSettings: Partial<InitializationSettings>): Promise<Status<unknown>> {
		const status = Status.createPending();

		await RealmeyeRenderService.attemptInitialization(
			RealmeyeRenderService.updateRenders,
			initializationSettings,
			Object.values(RenderGroup)
		);

		return status.finalize();
	}

	/**
	 * Calls to the `CanvasBuilder` to generate an buffered image of the player's characters
	 * @param playerData `RealmEyePlayerData` to generate visualization for
	 * @returns a `Buffer` with a visualization of the player's characters
	 */
	static playerVisualizationImage(playerData: RealmEyePlayerData): Promise<Buffer> {
		return CanvasBuilder.buildCharacterDisplayBuffer(playerData.characters, 'player');
	}

	/**
	 * Calls to the `CanvasBuilder` to generate an buffered image of the guild's top characters
	 * @param guildData `RealmEyeGuildData` to generate visualization for
	 * @returns a `Buffer` with a visualization of the guild's top characters
	 */
	static guildVisualizationImage(guildData: RealmEyeGuildData): Promise<Buffer> {
		return CanvasBuilder.buildCharacterDisplayBuffer(guildData.topCharacters, 'guild');
	}

	/**
	 * Retrieves the render with the given name from the DB
	 * @param name name of render
	 * @param defaultToEmpty if true, will return the buffered image of an empty slot if the render with the given name could not be found
	 * @returns a `IRender` object of the render with the given name
	 */
	static async getRenderByName(name: string, defaultToEmpty = false): Promise<IRender> {
		if (!(await RealmeyeRenderService._renderService.existsByName(name))) {
			if (!defaultToEmpty) {
				throw new RenderDoesNotExistError(`A render with the name, '${name}', does not exist.`);
			} else {
				return RealmeyeRenderService._renderService.findByRef('-1');
			}
		}
		return RealmeyeRenderService._renderService.findByName(name);
	}

	/**
	 * Retrieves the render with the given ref from the DB
	 * @param ref ref of render
	 * @param defaultToEmpty if true, will return the buffered image of an empty slot if the render with the given ref could not be found
	 * @returns a `IRender` object of the render with the given ref
	 */
	static async getRenderByRef(ref: string, defaultToEmpty = false): Promise<IRender> {
		if (!(await RealmeyeRenderService._renderService.existsByRef(ref))) {
			if (!defaultToEmpty) {
				throw new RenderDoesNotExistError(`A render with the ref, '${ref}', does not exist.`);
			} else {
				return RealmeyeRenderService._renderService.findByRef('-1');
			}
		}
		return RealmeyeRenderService._renderService.findByRef(ref);
	}

	/**
	 * Fetches all relevants renders for the given `RenderGroup`s and updates them in the DB
	 * @param updateGroups list of `RenderGroup`s to update
	 * @returns a `Status` with the outcome of the update
	 */
	private static async updateRenders(updateGroups: RenderGroup[]): Promise<Status<unknown>> {
		const status = Status.createPending();
		if (!RealmeyeRenderService._renderService) {
			status.addFailureReason({
				failure: 'Instance Not Initialized Yet',
				failureMessage:
					'RealmEyeService has not yet been initialized with a RenderService, so renders could not be updated.',
			});
			return status.finalize();
		}

		const promises = [];
		for (const group of updateGroups) {
			if (!RealmeyeRenderService._uninitializedRenderGroups.has(group)) {
				continue;
			}
			promises.push(
				RealmeyeRenderService.updateGroupRenders(group).then((s) => {
					status.merge(s);
				})
			);
		}

		return Promise.all(promises).then(() => {
			return status.finalize();
		});
	}

	/**
	 * Attempts to update the renders for the given `RenderGroup`
	 * Will check if the `RenderGroup` is up to date before updating if the _FORCE_UPDATE class field is false
	 * @param renderGroup `RenderGroup` to perform update for
	 * @returns a `Status` with the outcome of the update
	 */
	private static async updateGroupRenders(renderGroup: RenderGroup): Promise<Status<unknown>> {
		const status = Status.createPending();
		Logger.debug(`Starting ${renderGroup} render update...`);
		const startTime = Date.now();

		try {
			RealmeyeRenderService._uninitializedRenderGroups.delete(renderGroup);
			const fullRender = await RealmeyeRenderService.retrieveFullRenderBuffer(renderGroup);

			if (
				!RealmeyeRenderService._FORCE_UPDATE &&
				(await RealmeyeRenderService.renderUpToDate(renderGroup, fullRender))
			) {
				Logger.info(`${renderGroup} renders are already up to date! :)`);
				return status.finalize();
			} else {
				await RealmeyeRenderService.saveFullRender(renderGroup, fullRender);
			}

			switch (renderGroup) {
				case RenderGroup.ITEMS:
					status.merge(await RealmeyeRenderService.updateItemRenders(fullRender));
					break;
				case RenderGroup.CLASS_SKINS:
					status.merge(await RealmeyeRenderService.updateSkinRenders(fullRender));
					break;
				case RenderGroup.STARS:
					status.merge(await RealmeyeRenderService.updateStarRenders(fullRender));
					break;
				case RenderGroup.FAME:
					status.merge(await RealmeyeRenderService.updateFameRender(fullRender));
					break;
			}
		} catch (error) {
			let failureMessage = `Unexpected error occurred during ${renderGroup} render update`;
			failureMessage += error instanceof Error ? `: ${error.message}` : '';
			status.addFailureReason({
				failure: `${renderGroup} Render Update`,
				failureMessage: failureMessage,
			});
			Logger.warn(`${renderGroup} render update failed in ${(Date.now() - startTime) / 1000} seconds...`);

			RealmeyeRenderService._uninitializedRenderGroups.add(renderGroup);
			throw error;
		}

		status.finalize();
		if (status.isPassed) {
			Logger.debug(
				`Successfully completed ${renderGroup} render update in ${(Date.now() - startTime) / 1000} seconds!`
			);
		} else {
			Logger.warn(`${renderGroup} render update failed in ${(Date.now() - startTime) / 1000} seconds...`);
		}

		return status;
	}

	/**
	 * Updates the entries for all in-game items in the DB
	 * @param fullRender the `Buffer` containing renders for all in-game items
	 * @returns a `Status` with the outcome of the update
	 */
	private static async updateItemRenders(fullRender: Buffer): Promise<Status<unknown>> {
		const status = Status.createPending();

		const itemDefinitions = await RealmeyeRenderService.loadItemRenderDefinitions();

		status.merge(await this.cropAndSaveRenders(itemDefinitions, fullRender));
		return status.finalize();
	}

	/**
	 * Generates a `RenderDefinitionMap` for all item renders so that they
	 * can be used to identify each item render within the full render image
	 * @returns a `RenderDefinitionMap` for all item renders
	 */
	private static async loadItemRenderDefinitions(): Promise<RenderDefinitionMap> {
		const data: string = (await RealmeyeDataService.getRealmEyePage(RealmeyeRenderService._RENDER_DEFINITION_URL))
			.data;
		const formattedData = data.substring(6, data.length - 1).replace(/([\de]+):\[/g, '"$1":[');
		const parsedData = JSON.parse(formattedData);

		const renderDefinitions: RenderDefinitionMap = {};
		for (const key of Object.keys(parsedData)) {
			const def = parsedData[key];
			if (!Array.isArray(def)) {
				continue;
			} else if (def.length < 1) {
				continue;
			}

			const renderDef: RenderDefinition = {
				name: def[0],
				ref: key,
				type: RenderType.OTHER,
			};

			if (def.length === 7 || def.length === 8) {
				renderDef.type = def[1];
				// add offset for close cropping (without the extra 6 pixels on either side)
				renderDef.startX = def[3] + 6;
				renderDef.startY = def[4] + 6;
			} else if (def.length === 3) {
				renderDef.type = RenderType.PET;
				// add offset for close cropping (without the extra 3 pixels on either side for pets)
				renderDef.startX = def[1] + 3;
				renderDef.startY = def[2] + 3;
			} else {
				continue;
			}

			renderDef.width = 34;
			renderDef.height = 34;

			if (
				(RealmeyeRenderService._ITEM_RENDER_LOADING_MODE === 'skip' &&
					RealmeyeRenderService._ITEM_RENDER_TYPE_LIST.has(renderDef.type)) ||
				(RealmeyeRenderService._ITEM_RENDER_LOADING_MODE === 'include' &&
					!RealmeyeRenderService._ITEM_RENDER_TYPE_LIST.has(renderDef.type))
			) {
				continue;
			}

			renderDefinitions[renderDef.name] = renderDef;
		}
		return renderDefinitions;
	}

	/**
	 * Updates the entries for all in-game skins in the DB
	 * @param fullRender the `Buffer` containing renders for all in-game skins
	 * @returns a `Status` with the outcome of the update
	 */
	private static async updateSkinRenders(fullRender: Buffer): Promise<Status<unknown>> {
		const status = Status.createPending();

		const sharpRender = sharp(fullRender);
		const skinDefinitions = await RealmeyeRenderService.loadSkinRenderDefinitions(sharpRender);

		status.merge(await this.cropAndSaveRenders(skinDefinitions, sharpRender));

		return status.finalize();
	}

	/**
	 * Generates a `RenderDefinitionMap` for all skin renders so that they
	 * can be used to identify each skin render within the full render image
	 * @returns a `RenderDefinitionMap` for all skin renders
	 */
	private static async loadSkinRenderDefinitions(render: Sharp): Promise<RenderDefinitionMap> {
		const renderDefinitions: RenderDefinitionMap = {};

		const metadata = await render.metadata();

		for (const classDef of Object.values(RealmeyeDataService.classData)) {
			for (const skin of Object.values(classDef.skins)) {
				const renderDef: RenderDefinition = {
					name: skin.name === 'Classic' ? `${skin.name} ${classDef.name}` : skin.name,
					ref: `${classDef.id}:${skin.id}`,
					type: RenderType.SKIN,
				};

				renderDef.startX = 50 * skin.num;

				if (renderDef.startX >= metadata.width) {
					renderDef.startY = Math.floor(renderDef.startX / metadata.width) * 300;
					renderDef.startX = renderDef.startX % metadata.width;
				} else {
					renderDef.startY = 0;
				}

				// add cropping offset
				// TODO: check if special skin (larger) so not to overcrop
				renderDef.startX += 4;
				renderDef.startY += 4;

				renderDef.width = 42;
				renderDef.height = 42;

				if (skin.name === 'Classic') {
					const classSilhouette = { ...renderDef };
					classSilhouette.name += ' Silhouette';
					classSilhouette.ref = `-${classSilhouette.ref}`;
					classSilhouette.startY += 250;
					renderDefinitions[classSilhouette.name] = classSilhouette;
				}

				renderDefinitions[renderDef.name] = renderDef;
			}
		}

		return renderDefinitions;
	}

	/**
	 * Updates the entries for all stars in the DB
	 * @param fullRender the `Buffer` containing renders for all stars
	 * @returns a `Status` with the outcome of the update
	 */
	private static async updateStarRenders(fullRender: Buffer): Promise<Status<unknown>> {
		const status = Status.createPending();

		const starDefinitions: RenderDefinitionMap = {};
		for (let i = 0, stars = ['Light Blue', 'Blue', 'Red', 'Orange', 'Yellow', 'White']; i < stars.length; i++) {
			const starName = stars[i];
			starDefinitions[starName] = {
				name: starName,
				ref: `STAR-${starName.replace(/\s/g, '-').toUpperCase()}`,
				type: RenderType.STAR,
				startX: 0,
				startY: 24 * i,
				width: 24,
				height: 24,
			};
		}

		status.merge(await this.cropAndSaveRenders(starDefinitions, fullRender));
		return status.finalize();
	}

	/**
	 * Updates the entries for the fame icon in the DB
	 * @param fullRender the `Buffer` containing render for the fame icon
	 * @returns a `Status` with the outcome of the update
	 */
	private static async updateFameRender(fullRender: Buffer): Promise<Status<unknown>> {
		const status = Status.createPending();
		await RealmeyeRenderService._renderService.save({
			name: 'Fame Icon',
			ref: 'FAME',
			renderType: RenderType.FAME,
			data: fullRender,
		});

		return status.finalize();
	}

	/**
	 * Retrieves the full render image for the given `RenderGroup`
	 * @param renderGroup `RenderGroup` to retrieve render for
	 * @returns a `Buffer` with the full render for the given `RenderGroup`
	 */
	private static async retrieveFullRenderBuffer(renderGroup: RenderGroup): Promise<Buffer> {
		switch (renderGroup) {
			case RenderGroup.ITEMS:
				return RealmeyeRenderService.retrieveImageBuffer(RealmeyeRenderService._ITEM_RENDER_URL);
			case RenderGroup.CLASS_SKINS:
				return RealmeyeRenderService.retrieveImageBuffer(RealmeyeRenderService._CLASS_SKINS_RENDER_URL);
			case RenderGroup.STARS:
				return RealmeyeRenderService.retrieveImageBuffer(RealmeyeRenderService._STAR_RENDER_URL);
			case RenderGroup.FAME:
				return RealmeyeRenderService.retrieveImageBuffer(RealmeyeRenderService._FAME_RENDER_URL);
		}
	}

	/**
	 * Fetches the data from the given url and generates a `Buffer` from it
	 * @param url url to fetch render from
	 * @returns a `Buffer` of the data from the fetched url
	 */
	private static async retrieveImageBuffer(url: string): Promise<Buffer> {
		return RealmeyeRenderService._RequestService.get(url, { responseType: 'arraybuffer' }).then((res) => {
			return Buffer.from(res.data, 'binary');
		});
	}

	/**
	 * Checks if the `RenderGroup` is considered up to date in the DB using
	 * `Buffer.equals()` comparison
	 * @param renderGroup `RenderGroup` of render
	 * @param render `Buffer` of full render to compare to DB entry
	 * @returns whether the `RenderGroup` is already up to date in the DB
	 */
	private static async renderUpToDate(renderGroup: RenderGroup, render: Buffer): Promise<boolean> {
		if (!(await RealmeyeRenderService._renderService.existsByRef(`${renderGroup}-FULL-RENDER`))) {
			return false;
		}
		const fullRender = await RealmeyeRenderService._renderService.findByRef(`${renderGroup}-FULL-RENDER`);
		return fullRender.data.equals(render);
	}

	/**
	 * Saves the full render for the `RenderGroup` to the DB so that it can
	 * be used for comparison later instead of having to update all renders on
	 * every restart
	 * @param renderGroup `RenderGroup` the render represents
	 * @param render `Buffer` of render to save
	 * @returns the `IRender` generated after the DB insert
	 */
	private static async saveFullRender(renderGroup: RenderGroup, render: Buffer): Promise<IRender> {
		return RealmeyeRenderService._renderService.save({
			name: `${renderGroup} FULL RENDER`,
			ref: `${renderGroup}-FULL-RENDER`,
			renderType: RenderType.FULL_RENDER,
			data: render,
		});
	}

	/**
	 * Updates the DB with entries for each render from a `RenderDefinitionMap`
	 * @param definitions `RenderDefinitionMap` containing defintions of each render within the full render
	 * @param fullRender the full render containing all individual renders from the given `RenderDefinitionMap`
	 * @returns a `Status` with the outcome
	 */
	private static async cropAndSaveRenders(
		definitions: RenderDefinitionMap,
		fullRender: Buffer | Sharp
	): Promise<Status<unknown>> {
		const status = Status.createPending();

		const renderPromises = [];
		const sharpImage: Sharp = fullRender instanceof Buffer ? sharp(fullRender) : fullRender;
		for (const { name, ref, type, startX, startY, width, height } of Object.values(definitions)) {
			const buffer = await sharpImage
				.extract({
					left: startX,
					top: startY,
					width: width,
					height: height,
				})
				.toBuffer();
			renderPromises.push(
				RealmeyeRenderService._renderService.save({
					name: name,
					ref: ref,
					renderType: type,
					data: buffer,
				})
			);
		}

		return Promise.all(renderPromises).then(async () => {
			return status.finalize();
		});
	}
}
