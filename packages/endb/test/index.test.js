'use strict';

const test = require('ava');
const {all} = require('@endbjs/test');
const Endb = require('..');

test.serial('Endb is a class', (t) => {
	t.is(typeof Endb, 'function');
	t.notThrows(() => new Endb());
});

test.serial('Endb integrates storage adapters', async (t) => {
	const store = new Map();
	const endb = new Endb({store});
	t.is(store.size, 0);
	await endb.set('foo', 'bar');
	t.is(await endb.get('foo'), 'bar');
	t.is(store.size, 1);
});

test.serial('Endb supports custom serializers', async (t) => {
	t.pass(4);
	const serialize = async (data) => {
		t.pass();
		return JSON.stringify(data);
	};

	const deserialize = async (data) => {
		t.pass();
		return JSON.parse(data);
	};

	const endb = new Endb({serialize, deserialize});
	t.is(await endb.set('foo', 'bar'), true);
	t.is(await endb.get('foo'), 'bar');
});

const store = new Map();
all(test, Endb, {store});
