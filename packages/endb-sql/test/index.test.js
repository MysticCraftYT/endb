'use strict';

const util = require('util');
const test = require('ava');
const { all } = require('@endbjs/test');
const sqlite3 = require('sqlite3');
const Endb = require('@endbjs/endb');
const EndbSql = require('..');

class TestSqlite extends EndbSql {
  constructor(options = {}) {
    const opts = { uri: 'sqlite://:memory:', ...options };
    const path = opts.uri.replace(/^sqlite:\/\//, '');
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

              resolve(util.promisify(db.all.bind(db)));
            }
          });
        });
      },
      ...options,
    });
  }
}

const store = new TestSqlite();
all(test, Endb, { store });
