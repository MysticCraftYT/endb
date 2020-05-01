'use strict';

const apiTest = (test, Endb, options = {}) => {
  test.beforeEach(async () => {
    const endb = new Endb(options);
    await endb.clear();
  });

  test.serial('All methods returns a Promise.', (t) => {
    const endb = new Endb(options);
    t.true(endb.ensure('foo', 'bar') instanceof Promise);
    t.true(endb.get('foo') instanceof Promise);
    t.true(endb.has('foo') instanceof Promise);
    t.true(endb.set('foo', 'bar') instanceof Promise);
    t.true(endb.all() instanceof Promise);
    t.true(endb.entries() instanceof Promise);
    t.true(endb.keys() instanceof Promise);
    t.true(endb.values() instanceof Promise);
    t.true(endb.delete('foo') instanceof Promise);
    t.true(endb.clear() instanceof Promise);
  });

  test.serial('Endb#set resolves to true', async (t) => {
    const endb = new Endb(options);
    t.is(await endb.set('foo', 'bar'), true);
  });

  test.serial('Endb#get resolves to value', async (t) => {
    const endb = new Endb(options);
    await endb.set('foo', 'bar');
    t.is(await endb.get('foo'), 'bar');
  });

  test.serial(
    'Endb#get with non-existent key resolves to undefined',
    async (t) => {
      const endb = new Endb(options);
      t.is(await endb.get('foo'), undefined);
    }
  );

  test.serial('Endb#delete resolves to boolean', async (t) => {
    const endb = new Endb(options);
    await endb.set('foo', 'bar');
    t.is(await endb.delete('foo'), true);
  });

  test.serial('Endb#clear resolves to undefined', async (t) => {
    const endb = new Endb(options);
    t.is(await endb.clear(), undefined);
    await endb.set('foo', 'bar');
    t.is(await endb.clear(), undefined);
  });

  test.after.always(async () => {
    const endb = new Endb(options);
    await endb.clear();
  });
};

const adapterTest = (test, Endb, options) => {
  test.serial('URI automatically loads the storage adapters', async (t) => {
    const endb = new Endb(options);
    await endb.clear();
    t.is(await endb.get('foo'), undefined);
    await endb.set('foo', 'bar');
    t.is(await endb.get('foo'), 'bar');
    await endb.clear();
  });

  test.serial.cb('Connection errors are emitted to main class', (t) => {
    const endb = new Endb(badUri);
    endb.on('error', () => {
      t.pass();
      t.end();
    });
  });
};

const endbTest = (test, Endb, options = {}) => {
  apiTest(test, Endb, options);
};

module.exports = { endbTest, apiTest, adapterTest };
