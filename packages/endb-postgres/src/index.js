'use strict';

const pg = require('pg');
const Sql = require('./sql');

module.exports = class PostgreSQL extends Sql {
  constructor(options = {}) {
    const { uri = 'postgresql://localhost:5432' } = options;
    super({
      dialect: 'postgres',
      async connect() {
        const pool = new pg.Pool({ connectionString: uri });
        return Promise.resolve(async (sqlString) => {
          const { rows } = await pool.query(sqlString);
          return rows;
        });
      },
      ...options,
    });
  }
};
