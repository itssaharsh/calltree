// Single-table DynamoDB access with an in-memory twin for MOCK_MODE=1 (tests, CI, offline verify).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

export const MOCK = process.env.MOCK_MODE === '1';
const TABLE = process.env.TABLE_NAME || 'calltree';
const mem = globalThis.__calltreeMem || (globalThis.__calltreeMem = new Map());
let doc;
const client = () => (doc ||= DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } }));
const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const key = (PK, SK) => `${PK}|${SK}`;

export async function get(PK, SK) {
  if (MOCK) return clone(mem.get(key(PK, SK)) || null);
  const r = await client().send(new GetCommand({ TableName: TABLE, Key: { PK, SK } }));
  return r.Item || null;
}

export async function put(item) {
  if (MOCK) { mem.set(key(item.PK, item.SK), clone(item)); return item; }
  await client().send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

export async function query(PK, { beginsWith, limit, forward = true } = {}) {
  if (MOCK) {
    let items = [...mem.values()].filter((i) => i.PK === PK && (!beginsWith || String(i.SK).startsWith(beginsWith)));
    items.sort((a, b) => (a.SK < b.SK ? -1 : a.SK > b.SK ? 1 : 0));
    if (!forward) items.reverse();
    return clone(limit ? items.slice(0, limit) : items);
  }
  const items = [];
  let ExclusiveStartKey;
  do {
    const r = await client().send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: beginsWith ? 'PK = :pk AND begins_with(SK, :sk)' : 'PK = :pk',
      ExpressionAttributeValues: beginsWith ? { ':pk': PK, ':sk': beginsWith } : { ':pk': PK },
      ScanIndexForward: forward,
      Limit: limit,
      ExclusiveStartKey,
    }));
    items.push(...(r.Items || []));
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey && (!limit || items.length < limit));
  return limit ? items.slice(0, limit) : items;
}

export async function update(PK, SK, patch) {
  const keys = Object.keys(patch);
  if (MOCK) { const cur = mem.get(key(PK, SK)) || { PK, SK }; const next = { ...cur, ...clone(patch) }; mem.set(key(PK, SK), next); return clone(next); }
  if (!keys.length) return get(PK, SK);
  const names = {}, values = {};
  const sets = keys.map((k, i) => { names[`#k${i}`] = k; values[`:v${i}`] = patch[k]; return `#k${i} = :v${i}`; });
  const r = await client().send(new UpdateCommand({ TableName: TABLE, Key: { PK, SK }, UpdateExpression: `SET ${sets.join(', ')}`, ExpressionAttributeNames: names, ExpressionAttributeValues: values, ReturnValues: 'ALL_NEW' }));
  return r.Attributes;
}

export async function increment(PK, SK, field, by = 1) {
  if (MOCK) { const cur = mem.get(key(PK, SK)) || { PK, SK }; cur[field] = (cur[field] || 0) + by; mem.set(key(PK, SK), cur); return cur[field]; }
  const r = await client().send(new UpdateCommand({ TableName: TABLE, Key: { PK, SK }, UpdateExpression: 'ADD #f :by', ExpressionAttributeNames: { '#f': field }, ExpressionAttributeValues: { ':by': by }, ReturnValues: 'ALL_NEW' }));
  return r.Attributes[field];
}

export async function del(PK, SK) {
  if (MOCK) { mem.delete(key(PK, SK)); return; }
  await client().send(new DeleteCommand({ TableName: TABLE, Key: { PK, SK } }));
}

export async function batchPut(items) {
  if (MOCK) { for (const i of items) mem.set(key(i.PK, i.SK), clone(i)); return; }
  for (let i = 0; i < items.length; i += 25) {
    let RequestItems = { [TABLE]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) };
    for (let tries = 0; tries < 5 && RequestItems && Object.keys(RequestItems).length; tries++) {
      const r = await client().send(new BatchWriteCommand({ RequestItems }));
      RequestItems = r.UnprocessedItems && Object.keys(r.UnprocessedItems).length ? r.UnprocessedItems : null;
      if (RequestItems) await new Promise((res) => setTimeout(res, 200 * (tries + 1)));
    }
  }
}

export async function deleteAll(PK, beginsWith) {
  const items = await query(PK, { beginsWith });
  if (MOCK) { for (const i of items) mem.delete(key(i.PK, i.SK)); return items.length; }
  for (let i = 0; i < items.length; i += 25) {
    const RequestItems = { [TABLE]: items.slice(i, i + 25).map((it) => ({ DeleteRequest: { Key: { PK: it.PK, SK: it.SK } } })) };
    await client().send(new BatchWriteCommand({ RequestItems }));
  }
  return items.length;
}

export function resetMock() { mem.clear(); }
