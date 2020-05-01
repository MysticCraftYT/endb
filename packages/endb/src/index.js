'use strict';

const EventEmitter = require('events');
const {stringify, parse} = require('buffer-json');
const _get = require('lodash/get');
const _set = require('lodash/set');
const _unset = require('lodash/unset');
const _has = require('lodash/has');
const _toPath = require('lodash/toPath');

const load = (options) => {
	const adapters = {
		mongodb: '@endbjs/mongo',
		mysql: '@endbjs/mysql',
		postgres: '@endbjs/postgres',
		postgresql: '@endbjs/postgres',
		redis: '@endbjs/redis',
		sqlite: '@endbjs/sqlite',
		sqlite3: '@endbjs/sqlite'
	};
	const validAdapters = Object.keys(adapters);
	if (options.adapter || options.uri) {
		const adapter = options.adapter || /^[^:]*/.exec(options.uri)[0];
		if (validAdapters.includes(adapter)) {
			const Adapter = require(adapters[adapter]);
			return new Adapter(options);
		}
	}

	return new Map();
};

class Endb extends EventEmitter {
	constructor(options = {}) {
		super();
		this.options = {
			namespace: 'endb',
			serialize: stringify,
			deserialize: parse,
			...(typeof options === 'string' ? {uri: options} : options)
		};

		if (!this.options.store) {
			this.options.store = load(this.options);
		}

		if (typeof this.options.store.on === 'function') {
			this.options.store.on('error', (error) => this.emit('error', error));
		}

		this.options.store.namespace = this.options.namespace;
	}

	async all() {
		const {store, deserialize} = this.options;
		if (store instanceof Map) {
			const elements = [];
			for (const [key, value] of store) {
				elements.push({
					key: this._removeKeyPrefix(key),
					value: typeof value === 'string' ? deserialize(value) : value
				});
			}

			return elements;
		}

		const elements = [];
		const data = await store.all();
		for (const {key, value} of data) {
			elements.push({
				key: this._removeKeyPrefix(key),
				value: typeof value === 'string' ? deserialize(value) : value
			});
		}

		return elements;
	}

	async clear() {
		const {store} = this.options;
		return store.clear();
	}

	async delete(key, path = null) {
		if (path !== null) {
			let value = await this.get(key);
			path = _toPath(path);
			const last = path.pop();
			const propValue = path.length ? _get(value, path) : value;
			if (Array.isArray(propValue)) {
				propValue.splice(last, 1);
			} else {
				delete propValue[last];
			}

			if (path.length) {
				_set(value, path, propValue);
			} else {
				value = propValue;
			}

			const result = await this.set(key, value);
			return result;
		}

		key = this._addKeyPrefix(key);
		const {store} = this.options;
		return store.delete(key);
	}

	async ensure(key, value, path = null) {
		const exists = await this.has(key);
		if (path !== null) {
			if (!exists) throw new Error('Endb#ensure: key does not exist.');
			const propValue = await this.has(key, path);
			if (!propValue) {
				const result = await this.get(key, value);
				return result;
			}

			await this.set(key, value, path);
			return value;
		}

		if (exists) {
			const result = await this.get(key);
			return result;
		}

		await this.set(key, value);
		return value;
	}

	async entries() {
		const elements = await this.all();
		return elements.map(({key, value}) => [key, value]);
	}

	async find(fn, thisArg) {
		if (typeof thisArg !== 'undefined') {
			fn = fn.bind(thisArg);
		}

		const data = await this.all();
		for (const {key, value} of data) {
			if (fn(value, key)) return value;
		}

		return undefined;
	}

	async get(key, path = null) {
		key = this._addKeyPrefix(key);
		const {store, deserialize} = this.options;
		const data = await store.get(key);
		const deserializedData =
			typeof data === 'string' ? deserialize(data) : data;
		if (deserializedData === undefined) return;
		if (path !== null) return _get(deserializedData, path);
		return deserializedData;
	}

	async has(key, path = null) {
		if (path !== null) {
			const data = await this.get(key);
			return _has(data || {}, path);
		}

		key = this._addKeyPrefix(key);
		const {store} = this.options;
		const exists = await store.has(key);
		return exists;
	}

	async keys() {
		const elements = await this.all();
		return elements.map(({key}) => key);
	}

	async math(key, operation, operand, path = null) {
		const data = await this.get(key);
		if (path !== null) {
			const propValue = _get(data, path);
			if (typeof propValue !== 'number') {
				throw new TypeError('Endb#path: first operand must be a number.');
			}

			const result = await this.set(
				key,
				_math(propValue, operation, operand),
				path
			);
			return result;
		}

		if (typeof data !== 'number') {
			throw new TypeError('Endb#path: first operand must be a number.');
		}

		const result = await this.set(key, _math(data, operation, operand));
		return result;
	}

	static multi(names, options = {}) {
		if (!Array.isArray(names) || names.length === 0) {
			throw new TypeError('Endb#math: names must be an array of strings.');
		}

		const instances = {};
		for (const name of names) {
			instances[name] = new Endb(options);
		}

		return instances;
	}

	async push(key, value, path = null, allowDuplicates = false) {
		const data = await this.get(key);
		if (path !== null) {
			const propValue = _get(data, path);
			if (!Array.isArray(propValue)) {
				throw new TypeError('Endb#push: target must be an array.');
			}

			if (!allowDuplicates && propValue.includes(value)) return value;
			propValue.push(value);
			_set(data, path, propValue);
		} else {
			if (!Array.isArray(data)) {
				throw new TypeError('Endb#push: target must be an array.');
			}

			if (!allowDuplicates && data.includes(value)) return value;
			data.push(value);
		}

		await this.set(key, data);
		return value;
	}

	async remove(key, value, path = null) {
		const data = await this.get(key);
		if (path !== null) {
			const propValue = _get(data, path);
			if (Array.isArray(propValue)) {
				propValue.splice(propValue.indexOf(value), 1);
				_set(data, path, propValue);
			} else if (typeof data === 'object') {
				_unset(data, `${path}.${value}`);
			}
		} else if (Array.isArray(data)) {
			if (data.includes(value)) {
				data.splice(data.indexOf(value), 1);
			}
		} else if (data !== null && typeof data === 'object') {
			delete data[value];
		}

		await this.set(key, data);
		return value;
	}

	async set(key, value, path = null) {
		const {store, serialize} = this.options;
		if (path !== null) {
			const value_ = await this.get(key);
			value = _set(value_ || {}, path, value);
		}

		key = this._addKeyPrefix(key);
		await store.set(key, serialize(value));
		return true;
	}

	async values() {
		const elements = await this.all();
		return elements.map(({value}) => value);
	}

	_addKeyPrefix(key) {
		return `${this.options.namespace}:${key}`;
	}

	_removeKeyPrefix(key) {
		return key.replace(`${this.options.namespace}:`, '');
	}
}

const _math = (firstOperand, operation, secondOperand) => {
	switch (operation) {
		case 'add':
		case 'addition':
		case '+':
			return firstOperand + secondOperand;
		case 'sub':
		case 'subtract':
		case '-':
			return firstOperand - secondOperand;
		case 'mult':
		case 'multiply':
		case '*':
			return firstOperand * secondOperand;
		case 'div':
		case 'divide':
		case '/':
			return firstOperand / secondOperand;
		case 'exp':
		case 'exponent':
		case '^':
			return firstOperand ** secondOperand;
		case 'mod':
		case 'modulo':
		case '%':
			return firstOperand % secondOperand;
		default:
			return undefined;
	}
};

module.exports = Endb;
module.exports.Endb = Endb;
