import { Request, Response, NextFunction } from 'express';

/** Protect Swagger/OpenAPI without adding JWT requirements to the application APIs. */
export function docsAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const username = process.env.SWAGGER_USERNAME;
  const password = process.env.SWAGGER_PASSWORD;
  if (!username || !password) {
    return res.status(404).json({ message: 'Documentation is not enabled.' });
  }

  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Compliance Hub API Documentation"');
    return res.status(401).send('Authentication required.');
  }

  const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0 || decoded.slice(0, separator) !== username || decoded.slice(separator + 1) !== password) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Compliance Hub API Documentation"');
    return res.status(401).send('Invalid documentation credentials.');
  }

  return next();
}
