import mysql from 'mysql2/promise';
import {EndbAdapter} from '..';
import EndbSql from './sql';

export interface EndbMysqlOptions {
	uri?: string;
	table?: string;
	keySize?: number;
}

export default class EndbMysql<TVal> extends EndbSql<TVal> implements EndbAdapter<TVal> {
	constructor(options: EndbMysqlOptions = {}) {
		const {uri = 'mysql://localhost'} = options;
		super({
			dialect: 'mysql',
			async connect() {
				const connection = await mysql.createConnection(uri);
				return async (sql: string): Promise<unknown> => {
					const [row] = await connection.execute(sql);
					return row;
				};
			},
			...options
		});
	}
}
