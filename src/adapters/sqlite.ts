'use strict';

const {promisify} = require('util');
const sqlite3 = require('sqlite3');
const Sql = require('./sql');

export interface EndbSqliteOptions {
	uri?: string;
	table: string;
}

export default class EndbSqlite extends Sql {
	constructor(options = {}) {
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
};
