import Endb from '../../src/endb';
import { adapterTest, endbTest } from '../functions';

adapterTest(Endb, 'sqlite://test.sqlite');
endbTest(Endb, { uri: 'sqlite://test.sqlite', busyTimeout: 30000 });
