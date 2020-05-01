'use strict';

const { all, adapter } = require('@endbjs/test');
const Endb = require('@endbjs/endb');
const EndbSqlite = require('..');
const test = require('ava');
const path = require('path');

const uri = `sqlite://${path.resolve(__dirname, 'test.sqlite')}`;
const store = new EndbSqlite({ uri, busyTimeout: 30000 });

adapter(test, Endb, uri);
all(test, Endb, store);