const TARKOV_DEV_API = 'https://api.tarkov.dev/graphql';

export async function queryTarkovDev<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(TARKOV_DEV_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`tarkov.dev API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`GraphQL error: ${json.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }

  return json.data as T;
}
