'use strict';

const EventEmitter = require('events');
const _get = require('lodash/get');
const _has = require('lodash/has');
const _set = require('lodash/set');
const _unset = require('lodash/unset');
const {parse, stringify} = require('buffer-json');

const load = (options) => {
	const adapters = {
		mongodb: './adapters/mongodb',
		mysql: './adapters/mysql',
		postgres: './adapters/postgres',
		postgresql: './adapters/postgres',
		redis: './adapters/redis',
		sqlite: './adapters/sqlite',
		sqlite3: './adapters/sqlite'
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

/**
 * Simple key-value storage with support for multiple backends.
 * @extends EventEmitter
 */
class Endb extends EventEmitter {
	/**
	 * The options for Endb.
	 * @typedef {Object} EndbOptions
	 * @property {string} [uri] The connection URI for the driver.
	 * @property {string} [namespace='endb'] The namespace of the database.
	 * @property {string} [adapter] The storage adapter or driver to use.
	 * @property {*} [store=Map]
	 * @property {Function} [serialize=stringify] Data serialization function.
	 * @property {Function} [deserialize=parse] Data deserialization function.
	 * @property {string} [collection='endb'] The name of the collection. Only works for MongoDB.
	 * @property {string} [table='endb'] The name of the table. Only works for SQL-based databases.
	 * @property {number} [keySize=255] The maximum size of the keys of elements. Only works for SQL-based databases.
	 */

	/**
	 * @param {string|EndbOptions} [options={}] The options for Endb.
	 */
	constructor(options = {}) {
		super();

		/**
		 * The options the database was instantiated with.
		 * @type {EndbOptions}
		 */
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

	/**
	 * Gets all the elements from the database.
	 * @return {Promise<any[]>} All the elements in the database.
	 */
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

	/**
	 * Clears all elements from the database.
	 * @return {Promise<void>} Returns `undefined`.
	 */
	async clear() {
		const {store} = this.options;
		return store.clear();
	}

	/**
	 * Deletes an element from the database by key.
	 * @param {string} key The key(s) of the element to remove from the database.
	 * @return {Promise<boolean>} `true` if the element is deleted successfully, otherwise `false`.
	 * @example
	 * await endb.set('foo', 'bar'); // true
	 *
	 * await endb.delete('foo'); // true
	 */
	async delete(key) {
		key = this._addKeyPrefix(key);
		const {store} = this.options;
		return store.delete(key);
	}

	/**
	 * Ensures if an element exists in the database. If the element does not exist, sets the element to the database and returns the value.
	 * @param {string} key The key of the element to ensure.
	 * @param {*} value The value of the element to ensure.
	 * @param {?string} [path]
	 * @return {Promise<void|any>} The (default) value of the element.
	 * @example
	 * await endb.set('en', 'db');
	 *
	 * const data = await endb.ensure('foo', 'bar');
	 * console.log(data); // 'bar'
	 *
	 * const data = await endb.ensure('en', 'db');
	 * console.log(data); // 'db'
	 */
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

	/**
	 * Finds a single item where the given function returns a truthy value.
	 * Behaves like {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find Array.prototype.find}.
	 * The database elements is mapped by their `key`. If you want to find an element by key, you should use the `get` method instead.
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get MDN} for more details.
	 * @param {Function} fn The function to execute on each value in the element.
	 * @param {*} [thisArg] Object to use as `this` inside callback.
	 * @return {Promise<*|void>} The first element in the database that satisfies the provided testing function. Otherwise `undefined` is returned
	 * @example
	 * await endb.find(v => v === 'bar'); // { key: 'foo', value: 'bar' }
	 * await endb.find(v => v.verified === true); // { key: 'profile', value: { ... } }
	 * await endb.find(v => v.desc === 'desc'); // undefined
	 */
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

	/**
	 * Gets the value of an element from the database by key.
	 * @param {string} key The key of the element to get.
	 * @param {?string} [path] The path of the property to get from the value.
	 * @return {Promise<*|void>} The value of the element, or `undefined` if the element cannot be found in the database.
	 * @example
	 * const data = await endb.get('foo');
	 * console.log(data); // 'bar'
	 *
	 * // Using path feature
	 * await endb.get('profile', 'verified'); // false
	 */
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

	/**
	 * Checks whether an element exists in the database or not.
	 * @param {string} key The key of an element to check for.
	 * @param {?string} [path] The path of the property to check.
	 * @return {Promise<boolean>} `true` if the element exists in the database, otherwise `false`.
	 */
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

	/**
	 * Returns an array that contains the keys of each element.
	 * @return {Promise<string[]>} An array that contains the keys of each element.
	 */
	async keys() {
		const elements = await this.all();
		return elements.map(({key}) => key);
	}

	/**
	 * Performs a mathematical operation on a value of an element.
	 * @param {string} key The key of the element.
	 * @param {string} operation The mathematical operation to perform.
	 * @param {number} operand The right-hand operand.
	 * @param {?string} [path] The path of the property to perform mathematical operation on.
	 * @return {true} Returns `true`.
	 * @example
	 * balance.set('endb', 100);
	 *
	 * balance.math('endb', 'add', 100); // true
	 */
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

	/**
	 * Creates multiple instances of Endb.
	 * @param {string[]} names An array of strings. Each element will create new instance.
	 * @param {EndbOptions} [options=EndbOptions] The options for the instances.
	 * @return {Object} An object containing created Endb instances.
	 * @example
	 * const endb = Endb.multi(['users', 'members']);
	 * const endb = Endb.multi(['users', 'members'], {
	 *     uri: 'sqlite://endb.sqlite',
	 *     namespace: 'mydb'
	 * });
	 *
	 * await enbb.users.set('foo', 'bar');
	 * await endb.members.set('bar', 'foo');
	 */
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

	/**
	 * Pushes an item to the array value in the database.
	 * @param {string} key The key of the element to push to.
	 * @param {*} value The value to push.
	 * @param {?string} [path] The path of the property of the value to push.
	 * @param {boolean} [allowDuplicates=false] Whether or not, allow duplicates elements in the value.
	 * @return {Promise<*>} The value to push.
	 */
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

	/**
	 * Removes an item from the array value of an element in the database.
	 * Note: structured or complex data types such as arrays or objects cannot be removed from the value of the element.
	 * @param {string} key The key of the element to remove.
	 * @param {string} value The value to remove.
	 * @param {?string} [path] The path of the property to remove.
	 * @return {Promise<string>} The value to remove.
	 */
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

	/**
	 * Sets an element to the database.
	 * @param {string} key The key of the element to set to the database.
	 * @param {*} value The value of the element to set to the database.
	 * @param {?string} [path] The path of the property to set in the value.
	 * @return {Promise<boolean>} Returns a boolean.
	 * @example
	 * await endb.set('foo', 'bar');
	 * await endb.set('total', 400);
	 * await endb.set('exists', false);
	 * await endb.set('profile', {
	 *   id: 1234567890,
	 *   username: 'user',
	 *   verified: true,
	 *   nil: null
	 * });
	 * await endb.set('todo', [ 'Add a authentication system.', 'Refactor the generator' ]);
	 *
	 * await endb.set('profile', false, 'verified');
	 * await endb.set('profile', 100, 'balance');
	 */
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

	/**
	 * Returns an array that contains the values of each element.
	 * @return {Promise<any[]>} Array that contains the values of each element.
	 */
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
