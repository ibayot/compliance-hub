import { docsAuthMiddleware } from '../../common/middleware/docs-auth.middleware';

describe('docsAuthMiddleware', () => {
  const originalUser = process.env.SWAGGER_USERNAME;
  const originalPassword = process.env.SWAGGER_PASSWORD;

  afterEach(() => {
    if (originalUser === undefined) delete process.env.SWAGGER_USERNAME;
    else process.env.SWAGGER_USERNAME = originalUser;
    if (originalPassword === undefined) delete process.env.SWAGGER_PASSWORD;
    else process.env.SWAGGER_PASSWORD = originalPassword;
  });

  it('does not expose documentation when credentials are not configured', () => {
    delete process.env.SWAGGER_USERNAME;
    delete process.env.SWAGGER_PASSWORD;
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    docsAuthMiddleware({} as any, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('requires valid basic authentication', () => {
    process.env.SWAGGER_USERNAME = 'docs';
    process.env.SWAGGER_PASSWORD = 'secret';
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn(), setHeader: jest.fn() };
    const next = jest.fn();

    docsAuthMiddleware({ headers: {} } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows valid basic authentication', () => {
    process.env.SWAGGER_USERNAME = 'docs';
    process.env.SWAGGER_PASSWORD = 'secret';
    const credentials = Buffer.from('docs:secret').toString('base64');
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn(), setHeader: jest.fn() };
    const next = jest.fn();

    docsAuthMiddleware({ headers: { authorization: `Basic ${credentials}` } } as any, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
