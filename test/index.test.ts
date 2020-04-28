import Endb from '../src/endb';
import 'jest';

test('Endb is a class', async () => {
  expect(typeof Endb).toBe('function');
  expect(() => new Endb());
});

test('Endb integrates storage adapters', async () => {
  const store = new Map() as Map<any, any> & { namespace: string };
  const endb = new Endb({ store });
  expect(store.size).toEqual(0);
  await endb.set('foo', 'bar');
  expect(await endb.get('foo')).toBe('bar');
  expect(store.size).toEqual(1);
});

test('Endb supports custom serializers', async () => {
  const endb = new Endb({
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  });
  expect(await endb.set('foo', 'bar')).toBe(true);
  expect(await endb.get('foo')).toBe('bar');
});
