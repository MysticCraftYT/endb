import 'jest';

const apiTest = (Endb: any, options = {}): void => {
  beforeEach(async () => {
    const endb = new Endb(options);
    await endb.clear();
    jest.setTimeout(30000);
  });

  test('All methods returns a Promise.', () => {
    const endb = new Endb(options);
    expect(endb.get('foo') instanceof Promise).toBe(true);
    expect(endb.has('foo') instanceof Promise).toBe(true);
    expect(endb.set('foo', 'bar') instanceof Promise).toBe(true);
    expect(endb.all() instanceof Promise).toBe(true);
    expect(endb.entries() instanceof Promise).toBe(true);
    expect(endb.keys() instanceof Promise).toBe(true);
    expect(endb.values() instanceof Promise).toBe(true);
    expect(endb.delete('foo') instanceof Promise).toBe(true);
    expect(endb.clear() instanceof Promise).toBe(true);
  });

  test('Endb#set resolves to true', async () => {
    const endb = new Endb(options);
    expect(await endb.set('foo', 'bar')).toBe(true);
  });

  test('Endb#get resolves to value', async () => {
    const endb = new Endb(options);
    await endb.set('foo', 'bar');
    expect(await endb.get('foo')).toBe('bar');
  });

  test(
    'Endb#get with non-existent key resolves to undefined',
    async () => {
      const endb = new Endb(options);
      expect(await endb.get('foo')).toBeUndefined();
    }
  );

  test('Endb#delete resolves to boolean', async () => {
    const endb = new Endb(options);
    await endb.set('foo', 'bar');
    expect(await endb.delete('foo')).toBe(true);
  });

  test('Endb#clear resolves to undefined', async () => {
    const endb = new Endb(options);
    expect(await endb.clear()).toBeUndefined();
    await endb.set('foo', 'bar');
    expect(await endb.clear()).toBeUndefined();
  });

  afterAll(async () => {
    const endb = new Endb(options);
    await endb.clear();
  });
};

const adapterTest = (Endb: any, options = {}): void => {
  test('URI automatically loads the storage adapters', async () => {
    const endb = new Endb(options);
    await endb.clear();
    expect(await endb.get('foo')).toBeUndefined();
    await endb.set('foo', 'bar');
    expect(await endb.get('foo')).toBe('bar');
    await endb.clear();
  });
};

const endbTest = (Endb: any, options = {}): void => {
  apiTest(Endb, options);
};

export { endbTest, apiTest, adapterTest };
