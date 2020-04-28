import { EventEmitter } from 'events';
import { Sql } from 'sql-ts';
import { SQLDialects } from 'sql-ts/dist/configTypes';
import { TableWithColumns } from 'sql-ts/dist/table';
import { EndbAdapter, Element } from '..';

export interface EndbSqlOptions {
  dialect: SQLDialects;
  connect: () => Promise<(sql: string) => Promise<unknown>>;
  table?: string;
  keySize?: number;
}

export default abstract class EndbSql<TVal> extends EventEmitter
  implements EndbAdapter<TVal> {
  public namespace!: string;
  public readonly options: Required<EndbSqlOptions>;
  public readonly entry: TableWithColumns<{
    key: string;
    value: string;
  }>;

  public readonly query: (sql: string) => Promise<any>;
  constructor(options: EndbSqlOptions) {
    super();
    this.options = {
      table: 'endb',
      keySize: 255,
      ...options,
    };
    const db = new Sql(this.options.dialect);
    this.entry = db.define<{ key: string; value: string }>({
      name: this.options.table,
      columns: [
        {
          name: 'key',
          primaryKey: true,
          dataType: `VARCHAR(${Number(this.options.keySize)})`,
        },
        {
          name: 'value',
          dataType: 'TEXT',
        },
      ],
    });
    const connected = this.options
      .connect()
      .then(async (query) => {
        const createTable = this.entry.create().ifNotExists().toString();
        await query(createTable);
        return query;
      })
      .catch((error) => {
        this.emit('error', error);
      });
    this.query = async (sql: string): Promise<any> => {
      const query = await connected;
      if (query) return query(sql);
    };
  }

  public async all(): Promise<Element<string>[]> {
    const select = this.entry
      .select('*')
      .where(this.entry.key.like(`${this.namespace}:%`))
      .toString();
    const rows = await this.query(select);
    return rows;
  }

  public async clear(): Promise<void> {
    const del = this.entry
      .delete()
      .where(this.entry.key.like(`${this.namespace}:%`))
      .toString();
    await this.query(del);
  }

  public async delete(key: string): Promise<boolean> {
    const select = this.entry.select().where({ key }).toString();
    const del = this.entry.delete().where({ key }).toString();
    const [row] = await this.query(select);
    if (row === undefined) return false;
    await this.query(del);
    return true;
  }

  public async get(key: string): Promise<void | string> {
    const select = this.entry.select().where({ key }).toString();
    const [row] = await this.query(select);
    if (row === undefined) return undefined;
    return row.value;
  }

  public async has(key: string): Promise<boolean> {
    const select = this.entry.select().where({ key }).toString();
    const [row] = await this.query(select);
    return Boolean(row);
  }

  public async set(key: string, value: string): Promise<unknown> {
    let upsert;
    if (this.options.dialect === 'mysql') {
      value = value.replace(/\\/g, '\\\\');
    }

    if (this.options.dialect === 'postgres') {
      upsert = this.entry
        .insert({ key, value })
        .onConflict({
          columns: ['key'],
          update: ['value'],
        })
        .toString();
    } else {
      upsert = this.entry.replace({ key, value }).toString();
    }

    return this.query(upsert);
  }
}
