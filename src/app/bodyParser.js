const CRLF = Buffer.from('\r\n');
const DCRLF = Buffer.from('\r\n\r\n');

const parseBody = (bodyBuffer, boundary) => {
  const fields = [];
  let indexOfBoundary = bodyBuffer.indexOf(boundary);

  while (indexOfBoundary > 0) {
    const totalBoundary = indexOfBoundary + boundary.length;
    indexOfBoundary = bodyBuffer.indexOf(boundary, totalBoundary);

    const field = bodyBuffer.slice(totalBoundary, indexOfBoundary).slice(0, -2);
    fields.push(field);
  }
  return fields.slice(0, -1);
}

const getBoundary = (contentType) => {
  const [enctype, boundaryField] = contentType.split(';');
  const boundary = boundaryField.split('=')[1];
  return boundary;
};

const removeQuote = (value) => {
  if (value.startsWith('"') || value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return value;
};

const parseHeader = (headers) => {
  const header = {};
  const headersFields = headers.slice(CRLF.length).split(/;|\r\n/);

  headersFields.map((field) => {
    const [key, value] = field.split(/=|:/);
    header[key.trim().toLowerCase()] = removeQuote(value.trim());
  });

  return header;
};

const separateFields = (field) => {
  const headersBuffer = field.slice(0, field.indexOf(DCRLF));
  const header = parseHeader(headersBuffer.toString());

  const startIndex = headersBuffer.length + DCRLF.length;
  const endIndex = CRLF.length;
  const value = field.slice(startIndex, -endIndex);

  return { header, value };
};

const bodyParser = (req, res, next) => {
  if (!req.headers['content-type']) {
    next();
    return;
  }

  const boundary = getBoundary(req.headers['content-type']);
  const contentLength = +req.headers['content-length'];
  const rawBodyBuffer = Buffer.alloc(contentLength);
  let range = 0;

  req.on('data', (chunk) => {
    rawBodyBuffer.fill(chunk, range);
    range += chunk.length;
  });

  req.on('end', () => {
    const body = {};
    const boundaryBuffer = new Buffer.from(boundary, 'utf8');
    const fields = parseBody(rawBodyBuffer, boundaryBuffer);
    const parsedFields = fields.map(separateFields);

    parsedFields.forEach((field) => {
      body[field.header.name] = field;
    });
    req.body = body;
    next();
  });
};

module.exports = { bodyParser };
