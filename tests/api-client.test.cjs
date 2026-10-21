const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const clientPath = path.join(__dirname, '..', 'src', 'api', 'client.ts');
const clientSource = fs.readFileSync(clientPath, 'utf8');
const javascript = ts.transpileModule(clientSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText.replace(
  'import.meta.env.VITE_SUPER_ADMIN_API_BASE_URL',
  "'https://configured-api.example.test'",
);

let clientModule;
let originalWindow;
let originalFetch;
const testAccessToken = 'unit-test-access-token';

test.before(async () => {
  originalWindow = globalThis.window;
  originalFetch = globalThis.fetch;
  globalThis.window = { location: { origin: 'https://admin.example.test' } };
  clientModule = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
});

test.after(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = originalFetch;
});

function createClient() {
  return new clientModule.SuperAdminApiClient('https://api.example.test');
}

function setResponse({ status = 200, body }) {
  globalThis.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  });
}

test('parses a successful list envelope with pagination and request ID', async () => {
  setResponse({
    body: {
      data: [{ id: 'order-1' }],
      meta: {
        pagination: { limit: 25, offset: 0, total: 1 },
        requestId: 'req-list-1',
      },
    },
  });

  const result = await createClient().list('/api/v1/admin/orders', {}, undefined, testAccessToken);
  assert.deepEqual(result, {
    data: [{ id: 'order-1' }],
    meta: {
      pagination: { limit: 25, offset: 0, total: 1 },
      requestId: 'req-list-1',
    },
  });
});

test('parses a successful detail envelope with request ID', async () => {
  setResponse({
    body: { data: { id: 'partner-1' }, meta: { requestId: 'req-detail-1' } },
  });
  const result = await createClient().get(
    '/api/v1/admin/partners/partner-1',
    undefined,
    testAccessToken,
  );
  assert.deepEqual(result, {
    data: { id: 'partner-1' },
    meta: { requestId: 'req-detail-1' },
  });
});

test('maps all admin resources to protected routes and serializes list filters', async () => {
  let requestedUrl;
  let requestedOptions;
  globalThis.fetch = async (url, options) => {
    requestedUrl = new URL(url);
    requestedOptions = options;
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          data: [],
          meta: {
            pagination: { limit: 10, offset: 20, total: 0 },
            requestId: 'req-products',
          },
        });
      },
    };
  };

  const routes = {
    orders: '/api/v1/admin/orders',
    customers: '/api/v1/admin/customers',
    partners: '/api/v1/admin/partners',
    products: '/api/v1/admin/catalog/products',
  };

  for (const [resource, route] of Object.entries(routes)) {
    const result = await clientModule.listAdminResource(resource, {
      limit: 10,
      offset: 20,
      q: 'tea',
      status: 'active',
    }, undefined, 'verified-access-token');
    assert.equal(requestedUrl.pathname, route);
    assert.deepEqual(Object.fromEntries(requestedUrl.searchParams), {
      limit: '10',
      offset: '20',
      q: 'tea',
      status: 'active',
    });
    assert.equal(requestedOptions.headers.Authorization, 'Bearer verified-access-token');
    assert.deepEqual(result.meta.pagination, { limit: 10, offset: 20, total: 0 });
  }
});

test('parses standard API errors and prefers meta.requestId', async () => {
  setResponse({
    status: 400,
    body: {
      error: { code: 'INVALID_REQUEST', message: 'Filter is invalid.' },
      meta: { requestId: 'req-meta' },
    },
  });

  await assert.rejects(
    createClient().list('/api/v1/admin/products', {}, undefined, testAccessToken),
    (error) => {
      assert.ok(error instanceof clientModule.ApiClientError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 'INVALID_REQUEST');
      assert.equal(error.message, 'Filter is invalid.');
      assert.equal(error.requestId, 'req-meta');
      return true;
    },
  );
});

test('uses the documented legacy error.requestId fallback when meta ID is absent', async () => {
  setResponse({
    status: 404,
    body: {
      error: {
        code: 'NOT_FOUND',
        message: 'Record not found.',
        requestId: 'req-legacy',
      },
    },
  });

  await assert.rejects(
    createClient().get('/api/v1/admin/products/product-1', undefined, testAccessToken),
    (error) => error.requestId === 'req-legacy' && error.status === 404,
  );
});

test('uses meta.requestId in preference to legacy error.requestId', async () => {
  setResponse({
    status: 409,
    body: {
      error: {
        code: 'CONFLICT',
        message: 'The change conflicts.',
        requestId: 'req-legacy',
      },
      meta: { requestId: 'req-meta-preferred' },
    },
  });

  await assert.rejects(
    createClient().get('/api/v1/admin/products/product-1', undefined, testAccessToken),
    (error) => error.requestId === 'req-meta-preferred',
  );
});

test('returns safe client errors for malformed JSON and malformed success envelopes', async () => {
  setResponse({ status: 502, body: '<html>internal upstream diagnostic</html>' });
  await assert.rejects(
    createClient().list('/api/v1/admin/orders', {}, undefined, testAccessToken),
    (error) => {
      assert.equal(error.code, 'INVALID_RESPONSE');
      assert.equal(error.status, 502);
      assert.equal(error.message, 'The Super Admin API returned an invalid JSON response.');
      assert.doesNotMatch(error.message, /upstream|diagnostic/);
      return true;
    },
  );

  setResponse({ body: { data: [], meta: { requestId: 'req-no-pagination' } } });
  await assert.rejects(
    createClient().list('/api/v1/admin/orders', {}, undefined, testAccessToken),
    (error) => error.code === 'INVALID_RESPONSE' &&
      error.message === 'The API returned an invalid list response.',
  );

  setResponse({ body: { data: { id: 'product-1' } } });
  await assert.rejects(
    createClient().get('/api/v1/admin/products/product-1', undefined, testAccessToken),
    (error) => error.code === 'INVALID_RESPONSE' &&
      error.message === 'The API returned an invalid detail response.',
  );
});

test('uses generic HTTP failure details when the error envelope is malformed', async () => {
  setResponse({
    status: 503,
    body: { error: 'private database failure', meta: { requestId: 'req-503' } },
  });

  await assert.rejects(
    createClient().get('/api/v1/admin/products/product-1', undefined, testAccessToken),
    (error) => {
      assert.equal(error.status, 503);
      assert.equal(error.code, 'HTTP_ERROR');
      assert.equal(error.message, 'The Super Admin API request failed with status 503.');
      assert.equal(error.requestId, 'req-503');
      assert.doesNotMatch(error.message, /private|database/);
      return true;
    },
  );
});

test('does not expose network exception details or send credentials', async () => {
  let requestOptions;
  globalThis.fetch = async (_url, options) => {
    requestOptions = options;
    throw new Error('private transport diagnostic containing token=secret');
  };

  await assert.rejects(
    createClient().get('/api/v1/admin/products/product-1', undefined, testAccessToken),
    (error) => {
      assert.equal(error.code, 'NETWORK_ERROR');
      assert.equal(error.message, 'The Super Admin API could not be reached.');
      assert.doesNotMatch(error.message, /transport|token|secret/);
      return true;
    },
  );
  assert.equal(requestOptions.credentials, 'omit');
  assert.deepEqual(requestOptions.headers, {
    Accept: 'application/json',
    Authorization: `Bearer ${testAccessToken}`,
  });
});

test('refuses protected requests without an access token', async () => {
  let requested = false;
  globalThis.fetch = async () => {
    requested = true;
    throw new Error('Protected request should not be sent.');
  };

  await assert.rejects(
    createClient().list('/api/v1/admin/orders', {}),
    (error) => error.code === 'AUTHENTICATION_REQUIRED',
  );
  assert.equal(requested, false);
});
