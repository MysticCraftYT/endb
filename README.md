![Endb](media/logo.png)

# Endb &middot; [![Test](https://github.com/chroventer/endb/workflows/Test/badge.svg)](https://github.com/chroventer/endb) [![Downloads](https://badgen.net/npm/dt/endb)](https://www.npmjs.com/package/endb) [![GitHub Stars](https://badgen.net/github/stars/chroventer/endb)](https://github.com/chroventer/endb) [![License](https://badgen.net/github/license/chroventer/endb)](https://github.com/chroventer/endb/blob/master/LICENSE)
> Simple key-value storage with support for multiple backends.

- [**Easy-to-use**](#usage): Endb has a simplistic and convenient promise-based API.
- [**Adapters**](#usage): By default, data is cached in memory. Optionally, install and utilize a "storage adapter".
- [**Third-Party Adapters**](#third-party-adapters): You can optionally utilize third-party storage adapters or build your own.
- [**Namespaces**](#namespaces): Namespaces isolate elements within the database to enable useful functionalities.
- [**Custom Serializers**](#custom-serializers): Utilizes its own data serialization methods to ensure consistency across various storage backends.
- [**Embeddable**](#embeddable): Designed to be easily embeddable inside modules.
- [**Data Types**](#custom-serializers): Handles all the JSON types including [`Buffer`](https://nodejs.org/api/buffer.html).
- [**Error-Handling**](#usage): Connection errors are transmitted through, from the adapter to the main instance; consequently, connection errors do not exit or kill the process.

## Installation

**Node.js 12.x or newer is required.**

```shell
npm install endb
```

By default, data is cached in memory. Optionally, install and utilize a "storage adapter".
Officially supported adapters are MongoDB, Redis, MySQL, PostgreSQL, and SQLite.

```shell
npm install mongodb
npm install redis

# To use SQL-based databases, an additional package 'sql' must be installed with the driver.
npm install sql

npm install mysql2 # MySQL
npm install pg # PostgreSQL
npm install sqlite3 # SQLite
```

## Usage

```javascript
const Endb = require('endb');

// One of the following:
const endb = new Endb();
const endb = new Endb('mongodb://user:pass@localhost:27017/dbname');
const endb = new Endb('mysql://user:pass@localhost:3306/dbname');
const endb = new Endb('postgresql://user:pass@localhost:5432/dbname');
const endb = new Endb('redis://user:pass@localhost:6379');
const endb = new Endb('sqlite://path/to/database.sqlite');

// Handles connection errors
endb.on('error', error => console.error('Connection Error: ', error));

await endb.set('foo', 'bar'); // true
await endb.get('foo'); // 'bar'
await endb.has('foo'); // true
await endb.all(); // [ { key: 'foo', value: 'bar' } ]
await endb.delete('foo'); // true
await endb.clear(); // undefined
```

## Namespaces

Namespaces isolate elements within the database to avoid key collisions, separate elements by prefixing the keys, and allow clearance of only one namespace while utilizing the same database.

```javascript
const users = new Endb({ namespace: 'users' });
const members = new Endb({ namespace: 'members' });

await users.set('foo', 'users'); // true
await members.set('foo', 'members'); // true
await users.get('foo'); // 'users'
await members.get('foo'); // 'members'
await users.clear(); // undefined
await users.get('foo'); // undefined
await members.get('foo'); // 'members'
```

## Third-Party Adapters

You can optionally utilize third-party storage adapters or build your own.
Endb will integrate the third-party storage adapter and handle complex data types internally.

```javascript
const myAdapter = require('./my-adapter');
const endb = new Endb({ store: myAdapter });
```

For example, [`quick-lru`](https://github.com/sindresorhus/quick-lru) is an unrelated and independent module that has an API similar to that of Endb.

```javascript
const QuickLRU = require('quick-lru');

const lru = new QuickLRU({ maxSize: 1000 });
const endb = new Endb({ store: lru });
```

## Custom Serializers

Endb handles all the JSON data types including Buffer using its data serialization methods that encode Buffer data as a base64-encoded string, and decode JSON objects which contain buffer-like data, either as arrays of strings or numbers, into Buffer instances to ensure consistency across various backends.
Optionally, pass your own data serialization methods to support extra data types.

```javascript
const endb = new Endb({
    serialize: JSON.stringify,
    deserialize: JSON.parse
});
```

**Warning**: Using custom serializers means you lose any guarantee of data consistency.

## Embeddable

Endb is designed to be easily embeddable inside modules.
It is recommended to set a [namespace](#namespaces) for the module.

```javascript
class MyModule {
    constructor(options) {
        this.db = new Endb({
            uri: typeof opts.store === 'string' && opts.store,
			store: typeof opts.store !== 'string' && opts.store
            namespace: 'mymodule'
        });
    }
}

// Caches data in the memory by default.
const myModule = new MyModule();

// After installing "redis".
const myModule = new MyModule({ store: 'redis://localhost' });
const myModule = new AwesomeModule({ store: thirdPartyAdapter });
```

## Links

- [Documentation](https://endb.js.org "Documentation")
- [Discord](https://discord.gg/d5SYmjj)
- [GitHub](https://github.com/chroventer/endb "GitHub")
- [NPM](https://npmjs.com/package/endb "NPM")
