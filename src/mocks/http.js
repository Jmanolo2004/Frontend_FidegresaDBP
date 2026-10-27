export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = message => new HttpError(400, message);
export const unauthorized = message => new HttpError(401, message);
export const notFound = message => new HttpError(404, message);
export const conflict = message => new HttpError(409, message);

export function respond(data, status = 200) {
  return { data, status };
}

export function toPage(items, params) {
  const size = Math.min(100, Math.max(1, Number(params.size) || 10));
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const number = Math.min(Math.max(0, Number(params.page) || 0), totalPages - 1);
  return {
    content: items.slice(number * size, number * size + size),
    totalElements,
    totalPages,
    number,
    size,
    first: number === 0,
    last: number >= totalPages - 1
  };
}

export function nextId(collection) {
  return Math.max(0, ...collection.map(item => Number(item.id) || 0)) + 1;
}

export function requireText(value, message) {
  const text = String(value ?? "").trim();
  if (!text) throw badRequest(message);
  return text;
}
