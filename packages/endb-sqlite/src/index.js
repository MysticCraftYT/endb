'use strict';

const { promisify } = require('util');
const { Database } = require('sqlite3');
const EndbSql = require('@endbjs/sql');

module.exports = class EndbSqlite extends EndbSql {
  constructor(options = {}) {
    const opts = {
      uri: 'sqlite://:memory:',
      ...(typeof options === 'string' ? { uri: options } : options),
    };
    const path = opts.uri.replace(/^sqlite:\/\//, '');
    super({
      dialect: 'sqlite',
      async connect() {
        return new Promise((resolve, reject) => {
          const db = new Database(path, (error) => {
            if (error) {
              reject(error);
            } else {
              if (opts.busyTimeout) {
                db.configure('busyTimeout', opts.busyTimeout);
              }

              resolve(promisify(db.all.bind(db)));
            }
          });
        });
      },
      ...opts,
    });
  }
};
