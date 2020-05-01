'use strict';

const test = require('ava');
const {all, adapter} = require('@endbjs/test');
const Endb = require('@endbjs/endb');
const EndbRedis = require('..');

const {REDIS_HOST = 'localhost'} = process.env;
const uri = `redis://${REDIS_HOST}`;
const store = new EndbRedis(uri);

adapter(test, Endb, uri);
all(test, Endb, {store});
