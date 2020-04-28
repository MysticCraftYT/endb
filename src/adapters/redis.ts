import { EventEmitter } from 'events';
import { promisify } from 'util';
import redis from 'redis';
import { EndbAdapter, Element } from '..';

interface Client {
  del: (...keys: string[]) => Promise<number>;
  get: (key: string) => Promise<string>;
  sadd: (namespace: string, key: string) => Promise<number>;
  srem: (namespace: string, key: string) => Promise<unknown>;
  smembers: (namespace: string) => Promise<string[]>;
  set: (key: string, value: string) => Promise<unknown>;
  exists: (key: string) => Promise<boolean>;
  keys: (pattern: string) => Promise<string[]>;
}

export interface EndbRedisOptions extends redis.ClientOpts {
  uri?: string;
}

export default class EndbRedis<TVal> extends EventEmitter
  implements EndbAdapter<TVal> {
  namespace!: string;
  private readonly _db: Client;
  constructor(options: EndbRedisOptions) {
    super();
    if (options.uri && typeof options.url === 'undefined') {
      options.url = options.uri;
    }

    const client = redis.createClient(options);
    const methods: Array<keyof Client> = [
      'get',
      'set',
      'sadd',
      'del',
      'srem',
      'smembers',
      'exists',
      'keys',
    ];
    this._db = methods.reduce<Client>((object, method) => {
      const fn: any = client[method];
      object[method] = promisify(fn.bind(client));
      return object;
    }, {} as Client);
    client.on('error', (error) => this.emit('error', error));
  }

  public async all(): Promise<Element<string>[]> {
    const keys = await this._db.keys(`${this.namespace}*`);
    const elements = [];
    for (const key of keys) {
      const value = await this._db.get(key);
      elements.push({
        key,
        value,
      });
    }

    return elements;
  }

  public async clear(): Promise<void> {
    const namespace = this._prefixNamespace();
    const keys = await this._db.smembers(namespace);
    await this._db.del(...keys.concat(namespace));
  }

  public async delete(key: string): Promise<boolean> {
    const items = await this._db.del(key);
    await this._db.srem(this._prefixNamespace(), key);
    return items > 0;
  }

  public async get(key: string): Promise<void | string> {
    const value = await this._db.get(key);
    if (value === null) return;
    return value;
  }

  public async has(key: string): Promise<boolean> {
    return this._db.exists(key);
  }

  async set(key: string, value: string): Promise<unknown> {
    if (typeof value === 'undefined') return;
    await this._db.set(key, value);
    return this._db.sadd(this._prefixNamespace(), key);
  }

  private _prefixNamespace(): string {
    return `namespace:${this.namespace}`;
  }
}
