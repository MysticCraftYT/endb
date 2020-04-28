import Endb from '../../src';
// @ts-ignore
import { adapterTest, endbTest } from '../functions';
const { REDIS_HOST = 'localhost' } = process.env;
const uri = `redis://${REDIS_HOST}`;

adapterTest(Endb, uri);
endbTest(Endb, { uri });
