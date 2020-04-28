import Endb from '../../src/endb';
import { adapterTest, endbTest } from '../functions';
const {
  MYSQL_HOST = 'localhost',
  MYSQL_USER = 'mysql',
  MYSQL_PASSWORD,
  MYSQL_DATABASE = 'endb_test',
} = process.env;
const uri = `mysql://${MYSQL_USER}${
  MYSQL_PASSWORD ? `:${MYSQL_PASSWORD}` : ''
}@${MYSQL_HOST}/${MYSQL_DATABASE}`;

adapterTest(Endb, uri);
endbTest(Endb, { uri });
