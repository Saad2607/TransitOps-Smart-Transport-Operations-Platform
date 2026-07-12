/**
 * TransitOps — API error presentation helper.
 * Role 8: Jay (Integration & QA)
 *
 * Turns normalized apiClient errors (which carry `status` from the backend)
 * into a titled banner payload so forms can clearly explain *why* the API
 * rejected a request (duplicate registration, expired license, etc.).
 */

const DEFAULT_TITLES = {
  400: 'Invalid input',
  401: 'Session expired',
  403: 'Action not allowed',
  404: 'Not found',
  409: 'Duplicate record',
};

/**
 * @param {Error & { status?: number }} err normalized error from apiClient
 * @param {{ titles?: Record<number, string>, fallbackMessage?: string }} options
 *   `titles` lets each form override banner titles per HTTP status
 *   (e.g. 409 → "Duplicate registration number").
 * @returns {{ title: string, message: string }}
 */
export function describeApiError(err, { titles = {}, fallbackMessage = 'Request failed.' } = {}) {
  const status = err?.status;

  const title =
    titles[status] ||
    DEFAULT_TITLES[status] ||
    (status >= 500 ? 'Server error' : 'Request failed');

  return {
    title,
    message: err?.message || fallbackMessage,
  };
}
