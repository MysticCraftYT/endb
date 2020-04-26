import {EventEmitter} from 'events';
import {parse, stringify} from 'buffer-json';
import {default as _toPath} from 'lodash/toPath';
import {default as _get} from 'lodash/get';
import {default as _set} from 'lodash/set';
import {default as _has} from 'lodash/has';

export interface Element {
	key: string;
	value: any;
}

type OrPromise<T> = T | Promise<T>;

export interface EndbAdapter {
	namespace: string;
	on?: (event: 'error', callback: (error: Error) => void | never) => void;
	all?: () => OrPromise<Element[]>;
	clear: () => OrPromise<void>;
	delete: (key: string) => OrPromise<boolean>;
	get: (key: string) => OrPromise<void | any>;
	has: (key: string) => OrPromise<boolean>;
	set: (key: string, value: string) => OrPromise<unknown>;
}

export interface EndbOptions {
	uri?: string;
	namespace: string;
	adapter?: keyof typeof adapters;
	store: EndbAdapter;
	serialize: (data: any) => any;
	deserialize: (data: any) => any;
}

const adapters = {
	mongodb: './adapters/mongodb',
	mysql: './adapters/mysql',
	postgres: './adapters/postgres',
	redis: './adapters/redis',
	sqlite: './adapters/sqlite'
};

const loadStore = <
	TAdapterOptions extends {
		adapter?: keyof typeof adapters;
		uri?: string;
	}
>(
	options: TAdapterOptions
): EndbAdapter => {
	const validAdapters = Object.keys(adapters);
	let adapter: void | keyof typeof adapters;

	if (options.adapter) {
		adapter = options.adapter;
	} else if (options.uri) {
		const matches = /^[^:]+/.exec(options.uri);
		if (matches === null) {
			throw new Error(
				`[Endb]: Could not infer adapter from URI "${options.uri}"`
			);
		}

		adapter = matches[0] as keyof typeof adapters;
	}

	if (!adapter) {
		return new Map() as Map<string, string> & {namespace: string};
	}

	if (validAdapters.includes(adapter)) {
		const Adapter = require(adapters[adapter]).default;
		return new Adapter(options);
	}

	throw new Error(`[Endb]: Invalid adapter provided "${adapter}"`);
};

export class Endb extends EventEmitter {
	protected readonly options: EndbOptions;
	public constructor(options: Partial<EndbOptions>) {
		super();
		const adapterOptions = {
			namespace: 'endb',
			serialize: stringify,
			deserialize: parse,
			...options
		};
		this.options = {
			...adapterOptions,
			store: adapterOptions.store ?? loadStore(adapterOptions)
		};

		if (typeof this.options.store.on === 'function') {
			this.options.store.on('error', (error) => this.emit('error', error));
		}

		this.options.store.namespace = this.options.namespace;
	}

	public async all(): Promise<Element[]> {
		const {store, deserialize} = this.options;
		const elements = [];
		if (store instanceof Map) {
			for (const [key, value] of store) {
				elements.push({
					key: this._removeKeyPrefix(key),
					value: typeof value === 'string' ? deserialize(value) : value
				});
			}

			return elements;
		}

		const data = await store.all!();
		for (const {key, value} of data) {
			elements.push({
				key: this._removeKeyPrefix(key),
				value: typeof value === 'string' ? deserialize(value) : value
			});
		}

		return elements;
	}

	public async clear(): Promise<void> {
		const {store} = this.options;
		await store.clear();
	}

	public async delete(key: string, path?: string): Promise<boolean> {
		if (typeof path === 'string') {
			let value = await this.get(key);
			const pathArray = _toPath(path);
			const last = pathArray.pop();
			const propValue = pathArray.length ? _get(value, pathArray) : value;
			if (Array.isArray(propValue)) {
				propValue.splice(Number(last), 1);
			} else {
				delete propValue[Number(last)];
			}

			if (path.length) {
				_set(value, pathArray, propValue);
			} else {
				value = propValue;
			}

			await this.set(key, value);
		}

		key = this._addKeyPrefix(key);
		const {store} = this.options;
		return store.delete(key);
	}

	async entries(): Promise<Array<[string, any]>> {
		const elements = await this.all();
		return elements.map(({key, value}: Element) => [key, value]);
	}

	public async get(key: string, path?: string): Promise<void | any> {
		key = this._addKeyPrefix(key);
		const {store, deserialize} = this.options;
		const value = await store.get(key);
		const deserialized = typeof value === 'string' ? deserialize(value) : value;
		if (deserialized === undefined) return;
		if (typeof path === 'string') return _get(deserialized, path);
		return deserialized;
	}

	async has(key: string, path?: string): Promise<boolean> {
		if (typeof path === 'string') {
			const value = await this.get(key);
			return _has(value || {}, path);
		}

		const {store} = this.options;
		key = this._addKeyPrefix(key);
		const exists = await store.has(key);
		return exists;
	}

	public async keys(): Promise<string[]> {
		const elements = await this.all();
		return elements.map(({key}: Element) => key);
	}

	public async set(key: string, value: any, path?: string): Promise<boolean> {
		const {store, serialize} = this.options;
		if (typeof path === 'string') {
			const value_ = await this.get(key);
			value = _set(value_ || {}, path, value);
		}

		key = this._addKeyPrefix(key);
		await store.set(key, serialize(value));
		return true;
	}

	public async values(): Promise<any[]> {
		const elements = await this.all();
		return elements.map(({value}: Element) => value);
	}

	private _addKeyPrefix(key: string): string {
		return `${this.options.namespace}:${key}`;
	}

	private _removeKeyPrefix(key: string): string {
		return key.replace(`${this.options.namespace}:`, '');
	}
}
