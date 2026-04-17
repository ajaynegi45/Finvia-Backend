import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.00'],
    http_req_failed: ['rate==0'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const RUN_ID = __ENV.RUN_ID || String(Date.now());

const adminHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': `admin-${RUN_ID}`,
  'x-user-role': 'admin',
};

const financeHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': `finance-${RUN_ID}`,
  'x-user-role': 'finance',
};

const viewerHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': `viewer-${RUN_ID}`,
  'x-user-role': 'viewer',
};

function parseBody(response) {
  try {
    return response.json();
  } catch (error) {
    return null;
  }
}

function post(path, body, headers) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), { headers });
}

function put(path, body, headers) {
  return http.put(`${BASE_URL}${path}`, JSON.stringify(body), { headers });
}

function get(path, headers) {
  return http.get(`${BASE_URL}${path}`, headers ? { headers } : undefined);
}

export function setup() {
  const healthResponse = get('/health');
  check(healthResponse, {
    'health endpoint is up': (res) => res.status === 200,
  });

  const seedResponse = post('/products/fake-data', {}, adminHeaders);
  check(seedResponse, {
    'fake product seed succeeds': (res) => res.status === 201,
  });

  const productsResponse = get('/products');
  const productsBody = parseBody(productsResponse);

  check(productsResponse, {
    'product list succeeds': (res) => res.status === 200,
    'product list has enough fake data': () => Array.isArray(productsBody?.data) && productsBody.data.length >= 3,
  });

  return {
    products: productsBody.data.slice(0, 3),
    runId: RUN_ID,
  };
}

export default function (data) {
  const [productA, productB, productC] = data.products;

  group('Security and validation', () => {
    const unauthorizedCreate = post('/invoices', {
      customerName: `Unauthorized ${data.runId}`,
      items: [{ productId: productA.id, quantity: 1 }],
    }, { 'Content-Type': 'application/json' });

    const unauthorizedBody = parseBody(unauthorizedCreate);

    check(unauthorizedCreate, {
      'unauthorized mutation rejected': (res) => res.status === 401,
      'unauthorized error shape is correct': () => unauthorizedBody?.success === false && unauthorizedBody?.error?.code === 'UNAUTHORIZED',
    });

    const invalidCreate = post('/invoices', {
      customerName: '',
      items: [],
    }, adminHeaders);

    const invalidBody = parseBody(invalidCreate);

    check(invalidCreate, {
      'invalid payload rejected cleanly': (res) => res.status === 400,
      'validation error shape is correct': () => invalidBody?.success === false && invalidBody?.error?.code === 'VALIDATION_ERROR',
    });
  });

  let paidInvoiceId;
  let voidInvoiceId;

  group('Draft invoice to paid flow', () => {
    const createResponse = post('/invoices', {
      customerName: `K6 Paid Flow ${data.runId}`,
      notes: 'Created by k6 verification flow',
      items: [
        { productId: productA.id, quantity: 2 },
        { productId: productB.id, quantity: 1 },
      ],
    }, adminHeaders);

    const createBody = parseBody(createResponse);
    paidInvoiceId = createBody?.data?.id;

    check(createResponse, {
      'invoice created': (res) => res.status === 201,
      'invoice starts in draft state': () => createBody?.data?.status === 'DRAFT',
      'invoice has multiple line items': () => createBody?.data?.items?.length === 2,
      'invoice includes price snapshots': () => createBody?.data?.items?.every((item) => typeof item.unitPricePaise === 'number'),
    });

    const listResponse = get(`/invoices?q=${encodeURIComponent(`K6 Paid Flow ${data.runId}`)}`);
    const listBody = parseBody(listResponse);

    check(listResponse, {
      'invoice list works': (res) => res.status === 200,
      'invoice appears in list': () => Array.isArray(listBody?.data) && listBody.data.some((invoice) => invoice.id === paidInvoiceId),
    });

    const detailResponse = get(`/invoices/${paidInvoiceId}`);
    const detailBody = parseBody(detailResponse);

    check(detailResponse, {
      'invoice detail works': (res) => res.status === 200,
      'invoice detail includes line items': () => detailBody?.data?.items?.length === 2,
    });

    const updateResponse = put(`/invoices/${paidInvoiceId}/items`, {
      items: [
        { productId: productA.id, quantity: 1 },
        { productId: productC.id, quantity: 2 },
      ],
    }, adminHeaders);

    const updateBody = parseBody(updateResponse);

    check(updateResponse, {
      'draft invoice items updated': (res) => res.status === 200,
      'updated draft remains draft': () => updateBody?.data?.status === 'DRAFT',
      'updated line items persisted': () => updateBody?.data?.items?.length === 2,
    });

    const finalizeResponse = post(`/invoices/${paidInvoiceId}/finalize`, {}, adminHeaders);
    const finalizeBody = parseBody(finalizeResponse);

    check(finalizeResponse, {
      'finalize succeeds': (res) => res.status === 200,
      'invoice becomes finalized': () => finalizeBody?.data?.status === 'FINALIZED',
      'invoice number generated': () => /^INV-\d{4}-\d{6}$/.test(finalizeBody?.data?.invoiceNumber || ''),
      'finalize stays responsive': (res) => res.timings.duration < 2000,
    });

    const postFinalizeUpdate = put(`/invoices/${paidInvoiceId}/items`, {
      items: [{ productId: productA.id, quantity: 1 }],
    }, adminHeaders);

    const postFinalizeBody = parseBody(postFinalizeUpdate);

    check(postFinalizeUpdate, {
      'finalized invoice is immutable': (res) => res.status === 409,
      'immutability error is explicit': () => postFinalizeBody?.error?.code === 'INVOICE_NOT_DRAFT',
    });

    const forbiddenPay = post(`/invoices/${paidInvoiceId}/pay`, {}, viewerHeaders);
    const forbiddenPayBody = parseBody(forbiddenPay);

    check(forbiddenPay, {
      'paid endpoint is role-protected': (res) => res.status === 403,
      'forbidden role gets explicit error': () => forbiddenPayBody?.error?.code === 'FORBIDDEN',
    });

    const payResponse = post(`/invoices/${paidInvoiceId}/pay`, {}, financeHeaders);
    const payBody = parseBody(payResponse);

    check(payResponse, {
      'paid endpoint works for finance role': (res) => res.status === 200,
      'invoice becomes paid': () => payBody?.data?.status === 'PAID',
    });

    const invalidVoidAfterPaid = post(`/invoices/${paidInvoiceId}/void`, {}, adminHeaders);
    const invalidVoidBody = parseBody(invalidVoidAfterPaid);

    check(invalidVoidAfterPaid, {
      'invalid state transition rejected': (res) => res.status === 409,
      'invalid transition error is explicit': () => invalidVoidBody?.error?.code === 'INVALID_TRANSITION',
    });
  });

  group('Draft invoice to void flow', () => {
    const createResponse = post('/invoices', {
      customerName: `K6 Void Flow ${data.runId}`,
      notes: 'Void path verification',
      items: [
        { productId: productB.id, quantity: 1 },
        { productId: productC.id, quantity: 1 },
      ],
    }, adminHeaders);

    const createBody = parseBody(createResponse);
    voidInvoiceId = createBody?.data?.id;

    check(createResponse, {
      'second invoice created': (res) => res.status === 201,
      'second invoice starts in draft': () => createBody?.data?.status === 'DRAFT',
    });

    const finalizeResponse = post(`/invoices/${voidInvoiceId}/finalize`, {}, adminHeaders);
    const finalizeBody = parseBody(finalizeResponse);

    check(finalizeResponse, {
      'second invoice finalized': (res) => res.status === 200,
      'second invoice number generated': () => /^INV-\d{4}-\d{6}$/.test(finalizeBody?.data?.invoiceNumber || ''),
    });

    const voidResponse = post(`/invoices/${voidInvoiceId}/void`, {}, adminHeaders);
    const voidBody = parseBody(voidResponse);

    check(voidResponse, {
      'void endpoint works': (res) => res.status === 200,
      'invoice becomes void': () => voidBody?.data?.status === 'VOID',
    });
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'tests/k6/results-summary.json': JSON.stringify(data, null, 2),
  };
}
