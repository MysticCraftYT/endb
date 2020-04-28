import {promisify} from 'util';
import sqlite3 from 'sqlite3';
import {EndbAdapter} from '..';
import EndbSql from './sql';

export interface EndbSqliteOptions {
	uri?: string;
	table?: string;
	keySize?: number;
	busyTimeout?: number;
}

export default class EndbSqlite<TVal> extends EndbSql<TVal> implements EndbAdapter<TVal> {
	constructor(options: EndbSqliteOptions = {}) {
		const {uri = 'sqlite://:memory:'} = options;
		const path = uri.replace(/^sqlite:\/\//, '');
		super({
			dialect: 'sqlite',
			async connect() {
				return new Promise((resolve, reject) => {
					const db = new sqlite3.Database(path, (error) => {
						if (error) {
							reject(error);
						} else {
							if (options.busyTimeout) {
								db.configure('busyTimeout', options.busyTimeout);
							}

							resolve(promisify(db.all.bind(db)));
						}
					});
				});
			},
			...options
		});
	}
}
