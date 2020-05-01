'use strict';

const test = require('ava');
const { all, adapter } = require('@endbjs/test');
const Endb = require('@endbjs/endb');
const EndbMysql = require('..');

const {
    MYSQL_HOST = 'localhost',
    MYSQL_USER = 'mysql',
    MYSQL_PASSWORD,
    MYSQL_DATABASE = 'endb_test'
} = process.env;
const uri = `mysql://${MYSQL_USER}${MYSQL_PASSWORD ? `:${MYSQL_PASSWORD}` : ''}@${MYSQL_HOST}/${MYSQL_DATABASE}`;
const store = new EndbMysql(uri);

adapter(test, Endb, uri);
all(test, Endb, { store });
