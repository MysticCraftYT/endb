'use strict';

const test = require('ava');
const {all, adapter} = require('@endbjs/test');
const Endb = require('@endbjs/endb');
const EndbMongo = require('..');

const {MONGO_HOST = '127.0.0.1'} = process.env;
const uri = `mongodb://${MONGO_HOST}:27017`;
const store = new EndbMongo(uri);

adapter(test, Endb, uri);
all(test, Endb, {store});
