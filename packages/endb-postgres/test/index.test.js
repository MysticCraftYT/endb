'use strict';

const test = require('ava');
const { all, adapter } = require('@endbjs/test');
const Endb = require('@endbjs/endb');
const EndbPostgres = require('..');

const {
  POSTGRES_HOST = 'localhost',
  POSTGRES_USER = 'postgres',
  POSTGRES_PASSWORD,
  POSTGERS_DB = 'endb',
} = process.env;
const uri = `postgresql://${POSTGRES_USER}${POSTGRES_PASSWORD ? `:${POSTGRES_PASSWORD}` : ''}@${POSTGRES_HOST}:5432/${POSTGERS_DB}`;
const store = new EndbPostgres(uri);

adapter(test, Endb, uri);
all(test, Endb, { store });