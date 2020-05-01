'use strict';

const {createConnection} = require('mysql2/promise');
const EndbSql = require('@endbjs/sql');

module.exports = class EndbMysql extends EndbSql {
	constructor(options = {}) {
		const options_ = {
			uri: 'mysql://localhost',
			...(typeof options === 'string' ? {uri: options} : options)
		};
		super({
			dialect: 'mysql',
			async connect() {
				const connection = await createConnection(options_.uri);
				return async (sqlString) => {
					const [row] = await connection.execute(sqlString);
					return row;
				};
			},
			...options_
		});
	}
};
