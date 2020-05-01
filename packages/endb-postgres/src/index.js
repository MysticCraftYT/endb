'use strict';

const {Pool} = require('pg');
const EndbSql = require('@endbjs/sql');

module.exports = class EndbPostgres extends EndbSql {
	constructor(options = {}) {
		const options_ = {
			uri: 'postgresql://localhost:5432',
			...(typeof options === 'string' ? {uri: options} : options)
		};
		super({
			dialect: 'postgres',
			async connect() {
				const pool = new Pool({connectionString: options_.uri});
				return Promise.resolve(async (sqlString) => {
					const {rows} = await pool.query(sqlString);
					return rows;
				});
			},
			...options_
		});
	}
};
