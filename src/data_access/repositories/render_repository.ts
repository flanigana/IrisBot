import { injectable } from 'inversify';
import { Binary, ObjectID } from 'mongodb';
import { IRender, Render } from '../../models/render';
import { GenericRepository } from './generics/generic_repository';
import { Query } from './interfaces/repositories';

@injectable()
export class RenderRepository extends GenericRepository<IRender> {
	public constructor() {
		super(Render);
	}

	public async existsByName(name: string): Promise<boolean> {
		return this.existsByQuery({ name: name });
	}

	public async findByName(name: string): Promise<IRender> {
		return this.findByQuery({ name: name });
	}

	public async existsByRef(ref: string): Promise<boolean> {
		return this.existsByQuery({ ref: ref });
	}

	public async findByRef(ref: string): Promise<IRender> {
		return this.findByQuery({ ref: ref });
	}

	private convertDataToBuffer(render: IRender): IRender {
		if (!render || !render.data) {
			return render;
		}
		render.data = (render.data as any as Binary).buffer;
		return render;
	}

	private convertDataToBufferForAll(...renders: IRender[]): IRender[] {
		for (const render of renders) {
			this.convertDataToBuffer(render);
		}
		return renders;
	}

	override async findAll(): Promise<IRender[]> {
		return super.findAll().then((r) => this.convertDataToBufferForAll(...r));
	}

	override async findById(id: string | ObjectID): Promise<IRender> {
		return super.findById(id).then((r) => this.convertDataToBuffer(r));
	}

	override async findByQuery(query: Query<IRender>): Promise<IRender> {
		return super.findByQuery(query).then((r) => this.convertDataToBuffer(r));
	}

	override async findManyByQuery(query: Query<IRender>): Promise<IRender[]> {
		return super.findManyByQuery(query).then((r) => this.convertDataToBufferForAll(...r));
	}

	override async save(render: IRender): Promise<IRender> {
		const existing = await this.findByName(render.name);
		if (existing) {
			const updated = Object.assign(existing, render);
			return super.save(updated);
		} else {
			return super.save(render);
		}
	}
}
