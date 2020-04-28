'use strict';

import {EventEmitter} from 'events';
import {MongoClient, Collection} from 'mongodb';
import {EndbAdapter, Element} from '..';

export interface EndbMongoOptions {
	uri?: string;
	url: string;
	collection: string;
}

export default class EndbMongo<TVal> extends EventEmitter implements EndbAdapter<TVal> {
	public namespace!: string;
	public options: EndbMongoOptions;
	public db: Promise<Collection<Element<string>>>;
	constructor(options: Partial<EndbMongoOptions> = {}) {
		super();
		this.options = {
			url: 'mongodb://127.0.0.1:27017',
			collection: 'endb',
			...options
		};
		this.db = new Promise<Collection<Element<string>>>((resolve) => {
			MongoClient.connect(this.options.url, (error, client) => {
				if (error !== null) return this.emit('error', error);
				const db = client.db();
				const collection = db.collection(this.options.collection);
				db.on('error', (error) => this.emit('error', error));
				collection.createIndex(
					{key: 1},
					{
						unique: true,
						background: true
					}
				);
				resolve(collection);
			});
		});
	}

	public async all(): Promise<Element<string>[]> {
		const collection = await this.db;
		return collection.find({key: new RegExp(`^${this.namespace}:`)}).toArray();
	}

	public async clear(): Promise<void> {
		const collection = await this.db;
		await collection.deleteMany({key: new RegExp(`^${this.namespace}:`)});
	}

	public async delete(key: string): Promise<boolean> {
		if (typeof key !== 'string') return false;
		const collection = await this.db;
		const {deletedCount} = await collection.deleteOne({key});
		return deletedCount !== undefined && deletedCount > 0;
	}

	public async get(key: string): Promise<void | string> {
		const collection = await this.db;
		const doc = await collection.findOne({key});
		return doc === null ? undefined : doc.value;
	}

	public async has(key: string): Promise<boolean> {
		const collection = await this.db;
		const exists = (await collection.find({key}).count()) > 0;
		return exists;
	}

	public async set(key: string, value: string): Promise<unknown> {
		const collection = await this.db;
		return collection.replaceOne({key}, {key, value}, {upsert: true});
	}
};
