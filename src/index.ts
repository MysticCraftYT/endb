import { EventEmitter } from 'events';
import { parse, stringify } from 'buffer-json';
import { default as _toPath } from 'lodash/toPath';
import { default as _get } from 'lodash/get';
import { default as _set } from 'lodash/set';
import { default as _has } from 'lodash/has';

const adapters = {
  mongodb: './adapters/mongodb',
  mysql: './adapters/mysql',
  postgres: './adapters/postgres',
  redis: './adapters/redis',
  sqlite: './adapters/sqlite',
};

const loadStore = <TVal>(
  options: Partial<Endb.EndbOptions<TVal>>
): Endb.EndbAdapter<TVal> => {
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
    return new Map() as Map<string, string> & { namespace: string };
  }

  if (validAdapters.includes(adapter)) {
    const Adapter = require(adapters[adapter]).default;
    return new Adapter(options);
  }

  throw new Error(`[Endb]: Invalid adapter provided "${adapter}"`);
};

/**
 * 
 */
class Endb<TVal> extends EventEmitter {
  public readonly options: Endb.EndbOptions<TVal>;
  public constructor(options: Partial<Endb.EndbOptions<TVal>> = {}) {
    super();
    this.options = {
      namespace: 'endb',
      serialize: stringify,
      deserialize: parse,
      store: loadStore(options),
      ...options,
    };

    if (typeof this.options.store.on === 'function') {
      this.options.store.on('error', (error) => this.emit('error', error));
    }

    this.options.store.namespace = this.options.namespace;
  }

  /**
   * Gets all the elements from the database.
   * @return All the elements in the database.
   */
  public async all(): Promise<Endb.Element<TVal>[]> {
    const { store, deserialize } = this.options;
    const elements = [];
    if (store instanceof Map) {
      for (const [key, value] of store) {
        elements.push({
          key: this._removeKeyPrefix(key),
          value: typeof value === 'string' ? deserialize(value) : value,
        });
      }

      return elements;
    }

    const data = await store.all!();
    for (const { key, value } of data) {
      elements.push({
        key: this._removeKeyPrefix(key),
        value: typeof value === 'string' ? deserialize(value) : value,
      });
    }

    return elements;
  }

  /**
   * Clears all elements from the database.
   */
  public async clear(): Promise<void> {
    const { store } = this.options;
    await store.clear();
  }

  /**
   * Deletes an element or a property of an element from the database by key.
   * @param key The key of the element.
   * @param path The path of the property to delete from the element.
   * @return `true` if the element or the property is deleted successfully, otherwise `false`.
   */
  public async delete(key: string, path?: string): Promise<boolean> {
    if (typeof path === 'string') {
      let value = await this.get(key);
      const pathArray = _toPath(path);
      const last = pathArray.pop();
      const propValue = pathArray.length > 0 ? _get(value, pathArray) : value;
      if (Array.isArray(propValue)) {
        propValue.splice(Number(last), 1);
      } else {
        delete propValue[Number(last)];
      }

      if (path.length) {
        _set(value as any, pathArray, propValue);
      } else {
        value = propValue;
      }

      await this.set(key, value);
    }

    key = this._addKeyPrefix(key);
    const { store } = this.options;
    return store.delete(key);
  }

  /**
   * @return An array containing the key and the value of all the elements.
   */
  async entries(): Promise<Array<[string, any]>> {
    const elements = await this.all();
    return elements.map(({ key, value }: Endb.Element<TVal>) => [key, value]);
  }

  /**
   * Gets the value of an element or a property in the value by key.
   * @param key The key of the element.
   * @param path The path of the property to get from the value.
   * @return The value of the element or the property of the value.
   */
  public async get(key: string, path?: string): Promise<void | TVal> {
    key = this._addKeyPrefix(key);
    const { store, deserialize } = this.options;
    const value = await store.get(key);
    const deserialized = typeof value === 'string' ? deserialize(value) : value;
    if (deserialized === undefined) return;
    if (typeof path === 'string') return _get(deserialized, path);
    return deserialized;
  }

  /**
   * Checks whether an element or the property in the value exists or not.
   * @param key The key of the element.
   * @param path The path of the property to check for in the value.
   * @return `true` if the element or the property in the value exists, otherwise `false`.
   */
  async has(key: string, path?: string): Promise<boolean> {
    if (typeof path === 'string') {
      const value = await this.get(key);
      return _has(value || {}, path);
    }

    const { store } = this.options;
    key = this._addKeyPrefix(key);
    const exists = await store.has(key);
    return exists;
  }

  /**
   * Returns an array that contains the keys of each element.
   * @return An array that contains the keys of each element.
   */
  public async keys(): Promise<string[]> {
    const elements = await this.all();
    return elements.map(({ key }: Endb.Element<TVal>) => key);
  }

  /**
   * Sets an element to the database.
   * @param key The key of the element to set.
   * @param value The value of the element or the value of the property to set.
   * @param path The path of the property to set in the value.
   */
  public async set(key: string, value: any, path?: string): Promise<boolean> {
    const { store, serialize } = this.options;
    if (typeof path === 'string') {
      const value_ = await this.get(key);
      value = _set(value_ || {}, path, value);
    }

    key = this._addKeyPrefix(key);
    await store.set(key, serialize(value));
    return true;
  }

  /**
   * Returns an array that contains the values of each element.
   * @return Array that contains the values of each element.
   */
  public async values(): Promise<any[]> {
    const elements = await this.all();
    return elements.map(({ value }: Endb.Element<TVal>) => value);
  }

  private _addKeyPrefix(key: string): string {
    return `${this.options.namespace}:${key}`;
  }

  private _removeKeyPrefix(key: string): string {
    return key.replace(`${this.options.namespace}:`, '');
  }
}

namespace Endb {
  export interface Element<TVal> {
    key: string;
    value: TVal;
  }

  type OrPromise<T> = T | Promise<T>;

  export interface EndbAdapter<TVal, TSerialized = string> {
    namespace: string;
    on?: (event: 'error', callback: (error: Error) => void | never) => void;
    all?: () => OrPromise<Endb.Element<TSerialized>[]>;
    clear: () => OrPromise<void>;
    delete: (key: string) => OrPromise<boolean>;
    get: (key: string) => OrPromise<void | TVal | TSerialized>;
    has: (key: string) => OrPromise<boolean>;
    set: (key: string, value: TSerialized) => OrPromise<unknown>;
  }

  export interface EndbOptions<TVal, TSerialized = string> {
    uri?: string;
    adapter?: keyof typeof adapters;
    namespace: string;
    store: Endb.EndbAdapter<TVal, TSerialized>;
    serialize: (data: TVal) => TSerialized;
    deserialize: (data: TSerialized) => TVal;
  }
}

export = Endb;
