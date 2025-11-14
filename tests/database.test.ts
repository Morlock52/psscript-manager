import test from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../src/backend/src/db';

type QueryCall = { text: string; params: any[] };

type MockResponse = {
  rows: any[];
  rowCount: number;
  command: string;
  oid: number;
  fields: any[];
};

class MockPool {
  public queries: QueryCall[] = [];
  private responses: (MockResponse | Error)[];

  constructor(responses: (MockResponse | Error)[]) {
    this.responses = responses;
  }

  async query(text: string, params: any[] = []): Promise<MockResponse> {
    this.queries.push({ text, params });
    const response = this.responses.shift();
    if (!response) {
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    if (response instanceof Error) {
      throw response;
    }

    return response;
  }

  async connect(): Promise<any> {
    return {
      query: this.query.bind(this),
      release: () => {}
    };
  }
}

test('delete returns false when no rows are removed', async () => {
  const pool = new MockPool([
    { rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] }
  ]);
  const db = new Database(pool as unknown as any);

  const result = await db.delete('scripts', 10);

  assert.strictEqual(result, false);
  assert.strictEqual(pool.queries.length, 1);
  assert.match(pool.queries[0].text, /DELETE FROM scripts/);
  assert.deepStrictEqual(pool.queries[0].params, [10]);
});

test('delete returns true when a row is removed', async () => {
  const pool = new MockPool([
    { rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] }
  ]);
  const db = new Database(pool as unknown as any);

  const result = await db.delete('scripts', 5);

  assert.strictEqual(result, true);
});
