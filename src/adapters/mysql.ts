'use strict';

const mysql = require('mysql2/promise');
const Sql = require('./sql');

module.exports = class MySQL extends Sql {
	constructor(options = {}) {
		const {uri = 'mysql://localhost'} = options;
		super({
			dialect: 'mysql',
			async connect() {
				const connection = await mysql.createConnection(uri);
				return async (sqlString) => {
					const [row] = await connection.execute(sqlString);
					return row;
				};
			},
			...options
		});
	}
};
