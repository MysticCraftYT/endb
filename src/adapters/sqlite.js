'use strict';

const {promisify} = require('util');
const {safeRequire} = require('..');
const sqlite3 = safeRequire('sqlite3');
const Sql = require('./sql');

module.exports = class SQLite extends Sql {
	constructor(options = {}) {
		const {uri = 'sqlite://:memory:'} = options;
		const path = uri.replace(/^sqlite:\/\//, '');
		super({
			dialect: 'sqlite',
			async connect() {
				return new Promise((resolve, reject) => {
					const db = new sqlite3.Database(path, (error) => {
						if (error) reject(error);
						if (options.busyTimeout) {
							db.configure('busyTimeout', options.busyTimeout);
						}

						resolve(promisify(db.all.bind(db)));
					});
				});
			},
			...options
		});
	}
};
