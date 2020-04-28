import Endb from '../../src';
// @ts-ignore
import { adapterTest, endbTest } from '../functions';
const { MONGO_HOST = '127.0.0.1' } = process.env;
const uri = `mongodb://${MONGO_HOST}:27017?useUnifiedTopology=true`;

adapterTest(Endb, uri);
endbTest(Endb, { uri });