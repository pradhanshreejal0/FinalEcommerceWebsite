// Builds an Error that carries an HTTP status code.
// Usage: throw httpError("Cart is empty");  (defaults to 400)
// Controllers catch it and reply with err.statusCode.
export const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });
