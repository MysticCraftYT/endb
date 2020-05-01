'use strict';

const EventEmitter = require('events');
const {createClient} = require('redis');

module.exports = class EndbRedis extends EventEmitter {
	constructor(options = {}) {
		super();
		const options_ = {
			...(typeof options === 'string' ? {uri: options} : options)
		};
		if (options_.uri && typeof options_.url === 'undefined') {
			options_.url = options_.uri;
		}

		const client = createClient(options);
		this.db = [
			'get',
			'set',
			'sadd',
			'del',
			'exists',
			'srem',
			'keys',
			'smembers'
		].reduce((object, method) => {
			const fn = client[method];
			object[method] = require('util').promisify(fn.bind(client));
			return object;
		}, {});
		client.on('error', (error) => this.emit('error', error));
	}

	async all() {
		const keys = await this.db.keys(`${this.namespace}*`);
		const elements = [];
		for (const key of keys) {
			const value = await this.db.get(key);
			elements.push({key, value});
		}

		return elements;
	}

	async clear() {
		const namespace = this._prefixNamespace();
		const keys = await this.db.smembers(namespace);
		await this.db.del(...keys.concat(namespace));
	}

	async close() {
		await this.db.disconnect();
		return undefined;
	}

	async delete(key) {
		const items = await this.db.del(key);
		await this.db.srem(this._prefixNamespace(), key);
		return items > 0;
	}

	async get(key) {
		const value = await this.db.get(key);
		if (value === null) return;
		return value;
	}

	async has(key) {
		return this.db.exists(key);
	}

	async set(key, value) {
		if (typeof value === 'undefined') return;
		await this.db.set(key, value);
		return this.db.sadd(this._prefixNamespace(), key);
	}

	_prefixNamespace() {
		return `namespace:${this.namespace}`;
	}
};
