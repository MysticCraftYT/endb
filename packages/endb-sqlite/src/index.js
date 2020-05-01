'use strict';

const {promisify} = require('util');
const {Database} = require('sqlite3');
const EndbSql = require('@endbjs/sql');

module.exports = class EndbSqlite extends EndbSql {
	constructor(options = {}) {
		const options_ = {
			uri: 'sqlite://:memory:',
			...(typeof options === 'string' ? {uri: options} : options)
		};
		const path = options_.uri.replace(/^sqlite:\/\//, '');
		super({
			dialect: 'sqlite',
			async connect() {
				return new Promise((resolve, reject) => {
					const db = new Database(path, (error) => {
						if (error) {
							reject(error);
						} else {
							if (options_.busyTimeout) {
								db.configure('busyTimeout', options_.busyTimeout);
							}

							resolve(promisify(db.all.bind(db)));
						}
					});
				});
			},
			...options_
		});
	}
};
