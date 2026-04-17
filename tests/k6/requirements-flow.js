import http from 'k6/http';
import { check, group, sleep } from 'k6';

/**
 * k6 execution settings:
 * - vus: number of virtual users
 * - iterations: total number of test iterations
 * - thresholds: pass/fail rules for the run
 *
 * Important:
 * We only keep the `checks` threshold here because this test intentionally
 * sends invalid / unauthorized requests too. Those are expected failures
 * in the API, not test failures.
 */
export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate == 1.00'],
  },
};

/**
 * Base URL for the API.
 * Can be passed from the shell script using -e BASE_URL=...
 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * Unique run id so the test can create unique customer names.
 * This prevents collisions across repeated test runs.
 */
const RUN_ID = __ENV.RUN_ID || String(Date.now());

/**
 * Where k6 writes its summary JSON.
 * Passed from the shell script so the path is always valid.
 */
const SUMMARY_PATH = __ENV.SUMMARY_PATH || 'results-summary.json';

/**
 * Headers for an admin user.
 * Used for endpoints that require admin privileges.
 */
const adminHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': `admin-${RUN_ID}`,
  'x-user-role': 'admin',
};

/**
 * Headers for a finance user.
 * Used for actions like paying an invoice.
 */
const financeHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': `finance-${RUN_ID}`,
  'x-user-role': 'finance',
};

/**
 * Headers for a viewer user.
 * Used to verify that forbidden access is rejected.
 */
const viewerHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': `viewer-${RUN_ID}`,
  'x-user-role': 'viewer',
};

/**
 * Safely parse JSON response bodies.
 * If response is not valid JSON, return null instead of crashing.
 */
function parseBody(response) {
  try {
    return response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Helper for POST requests.
 */
function post(path, body, headers) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), { headers });
}

/**
 * Helper for PUT requests.
 */
function put(path, body, headers) {
  return http.put(`${BASE_URL}${path}`, JSON.stringify(body), { headers });
}

/**
 * Helper for GET requests.
 */
function get(path, headers) {
  return http.get(`${BASE_URL}${path}`, headers ? { headers } : undefined);
}

/**
 * setup() runs once before the main test execution.
 *
 * It is used here to:
 * 1. verify the API is alive
 * 2. seed fake product data
 * 3. fetch products that will be reused in the main test flow
 */
export function setup() {
  // Check that the API health endpoint responds correctly.
  const healthResponse = get('/health');
  check(healthResponse, {
    'health endpoint is up': (res) => res.status === 200,
  });

  // Seed fake products through the API.
  const seedResponse = post('/products/fake-data', {}, adminHeaders);
  check(seedResponse, {
    'fake product seed succeeds': (res) => res.status === 201,
  });

  // Fetch all products after seeding so the test can reuse them.
  const productsResponse = get('/products');
  const productsBody = parseBody(productsResponse);

  check(productsResponse, {
    'product list succeeds': (res) => res.status === 200,
    'product list has enough fake data': () =>
        Array.isArray(productsBody?.data) && productsBody.data.length >= 3,
  });

  // Return data that will be available inside default().
  return {
    products: productsBody.data.slice(0, 3),
    runId: RUN_ID,
  };
}

/**
 * default() is the main test flow.
 * This runs once because iterations = 1 and vus = 1.
 */
export default function (data) {
  // Use the first three seeded products in the invoice flows.
  const [productA, productB, productC] = data.products;

  /**
   * Security and validation checks.
   * These are expected to fail at the API level with proper error responses.
   * They are not k6 failures because the behavior is intentional.
   */
  group('Security and validation', () => {
    // Try creating an invoice without auth headers.
    const unauthorizedCreate = post(
        '/invoices',
        {
          customerName: `Unauthorized ${data.runId}`,
          items: [{ productId: productA.id, quantity: 1 }],
        },
        { 'Content-Type': 'application/json' }
    );

    const unauthorizedBody = parseBody(unauthorizedCreate);

    check(unauthorizedCreate, {
      'unauthorized mutation rejected': (res) => res.status === 401,
      'unauthorized error shape is correct': () =>
          unauthorizedBody?.success === false &&
          unauthorizedBody?.error?.code === 'UNAUTHORIZED',
    });

    // Try creating an invoice with invalid payload.
    const invalidCreate = post(
        '/invoices',
        {
          customerName: '',
          items: [],
        },
        adminHeaders
    );

    const invalidBody = parseBody(invalidCreate);

    check(invalidCreate, {
      'invalid payload rejected cleanly': (res) => res.status === 400,
      'validation error shape is correct': () =>
          invalidBody?.success === false &&
          invalidBody?.error?.code === 'VALIDATION_ERROR',
    });
  });

  // Store invoice ids so later steps can operate on the created invoices.
  let paidInvoiceId;
  let voidInvoiceId;

  /**
   * Paid invoice flow:
   * create -> list -> detail -> update items -> finalize -> reject update after finalize -> role check -> pay -> reject invalid void
   */
  group('Draft invoice to paid flow', () => {
    // Create a draft invoice.
    const createResponse = post(
        '/invoices',
        {
          customerName: `K6 Paid Flow ${data.runId}`,
          notes: 'Created by k6 verification flow',
          items: [
            { productId: productA.id, quantity: 2 },
            { productId: productB.id, quantity: 1 },
          ],
        },
        adminHeaders
    );

    const createBody = parseBody(createResponse);
    paidInvoiceId = createBody?.data?.id;

    check(createResponse, {
      'invoice created': (res) => res.status === 201,
      'invoice starts in draft state': () => createBody?.data?.status === 'DRAFT',
      'invoice has multiple line items': () => createBody?.data?.items?.length === 2,
      'invoice includes price snapshots': () =>
          createBody?.data?.items?.every((item) => typeof item.unitPricePaise === 'number'),
    });

    // Verify it appears in list search.
    const listResponse = get(`/invoices?q=${encodeURIComponent(`K6 Paid Flow ${data.runId}`)}`);
    const listBody = parseBody(listResponse);

    check(listResponse, {
      'invoice list works': (res) => res.status === 200,
      'invoice appears in list': () =>
          Array.isArray(listBody?.data) &&
          listBody.data.some((invoice) => invoice.id === paidInvoiceId),
    });

    // Fetch invoice details.
    const detailResponse = get(`/invoices/${paidInvoiceId}`);
    const detailBody = parseBody(detailResponse);

    check(detailResponse, {
      'invoice detail works': (res) => res.status === 200,
      'invoice detail includes line items': () => detailBody?.data?.items?.length === 2,
    });

    // Update the items while invoice is still in DRAFT state.
    const updateResponse = put(
        `/invoices/${paidInvoiceId}/items`,
        {
          items: [
            { productId: productA.id, quantity: 1 },
            { productId: productC.id, quantity: 2 },
          ],
        },
        adminHeaders
    );

    const updateBody = parseBody(updateResponse);

    check(updateResponse, {
      'draft invoice items updated': (res) => res.status === 200,
      'updated draft remains draft': () => updateBody?.data?.status === 'DRAFT',
      'updated line items persisted': () => updateBody?.data?.items?.length === 2,
    });

    // Finalize the invoice.
    const finalizeResponse = post(`/invoices/${paidInvoiceId}/finalize`, {}, adminHeaders);
    const finalizeBody = parseBody(finalizeResponse);

    check(finalizeResponse, {
      'finalize succeeds': (res) => res.status === 200,
      'invoice becomes finalized': () => finalizeBody?.data?.status === 'FINALIZED',
      'invoice number generated': () =>
          /^INV-\d{4}-\d{6}$/.test(finalizeBody?.data?.invoiceNumber || ''),
      'finalize stays responsive': (res) => res.timings.duration < 2000,
    });

    // Try updating after finalization, which should fail.
    const postFinalizeUpdate = put(
        `/invoices/${paidInvoiceId}/items`,
        {
          items: [{ productId: productA.id, quantity: 1 }],
        },
        adminHeaders
    );

    const postFinalizeBody = parseBody(postFinalizeUpdate);

    check(postFinalizeUpdate, {
      'finalized invoice is immutable': (res) => res.status === 409,
      'immutability error is explicit': () =>
          postFinalizeBody?.error?.code === 'INVOICE_NOT_DRAFT',
    });

    // Viewer should not be allowed to pay.
    const forbiddenPay = post(`/invoices/${paidInvoiceId}/pay`, {}, viewerHeaders);
    const forbiddenPayBody = parseBody(forbiddenPay);

    check(forbiddenPay, {
      'paid endpoint is role-protected': (res) => res.status === 403,
      'forbidden role gets explicit error': () =>
          forbiddenPayBody?.error?.code === 'FORBIDDEN',
    });

    // Finance role should be allowed to pay.
    const payResponse = post(`/invoices/${paidInvoiceId}/pay`, {}, financeHeaders);
    const payBody = parseBody(payResponse);

    check(payResponse, {
      'paid endpoint works for finance role': (res) => res.status === 200,
      'invoice becomes paid': () => payBody?.data?.status === 'PAID',
    });

    // Once paid, voiding should be rejected.
    const invalidVoidAfterPaid = post(`/invoices/${paidInvoiceId}/void`, {}, adminHeaders);
    const invalidVoidBody = parseBody(invalidVoidAfterPaid);

    check(invalidVoidAfterPaid, {
      'invalid state transition rejected': (res) => res.status === 409,
      'invalid transition error is explicit': () =>
          invalidVoidBody?.error?.code === 'INVALID_TRANSITION',
    });
  });

  /**
   * Void invoice flow:
   * create -> finalize -> void
   */
  group('Draft invoice to void flow', () => {
    const createResponse = post(
        '/invoices',
        {
          customerName: `K6 Void Flow ${data.runId}`,
          notes: 'Void path verification',
          items: [
            { productId: productB.id, quantity: 1 },
            { productId: productC.id, quantity: 1 },
          ],
        },
        adminHeaders
    );

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
      'second invoice number generated': () =>
          /^INV-\d{4}-\d{6}$/.test(finalizeBody?.data?.invoiceNumber || ''),
    });

    const voidResponse = post(`/invoices/${voidInvoiceId}/void`, {}, adminHeaders);
    const voidBody = parseBody(voidResponse);

    check(voidResponse, {
      'void endpoint works': (res) => res.status === 200,
      'invoice becomes void': () => voidBody?.data?.status === 'VOID',
    });
  });

  // Small pause so async workers have a chance to finish after the API flow.
  sleep(2);
}

/**
 * k6 writes a summary report at the end of execution.
 * The shell script passes SUMMARY_PATH so this file ends up in a known location.
 */
export function handleSummary(data) {
  return {
    [SUMMARY_PATH]: JSON.stringify(data, null, 2),
  };
}