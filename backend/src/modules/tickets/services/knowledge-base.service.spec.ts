import { KnowledgeBaseService } from './knowledge-base.service';

describe('KnowledgeBaseService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not save raw resolution notes when no AI provider is available', async () => {
    const repo = {
      create: jest.fn((value) => value),
      save: jest.fn(),
    } as any;
    const issueRepo = {} as any;
    const config = { get: jest.fn().mockReturnValue(undefined) } as any;
    const service = new KnowledgeBaseService(repo, issueRepo, config);

    await expect(service.generateKbFromTicket(
      'Printer issue',
      'The printer stopped responding.',
      'Restart the printer.',
    )).rejects.toThrow('No AI provider');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('creates an article from a Cloudflare Workers AI response', async () => {
    const repo = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue({ id: 2 }),
    } as any;
    const config = {
      get: jest.fn((key: string) => ({
        CLOUDFLARE_ACCOUNT_ID: 'account-123',
        CLOUDFLARE_API_TOKEN: 'token-123',
      } as Record<string, string | undefined>)[key]),
    } as any;
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
          result: { response: '{"title":"AD account creation","content":"```markdown\\n## Problem\\nAD access was needed.\\n\\n## Resolution\\nCreate the account.\\n```","tags":"active-directory"}' },
      }),
    } as Response);
    const service = new KnowledgeBaseService(repo, {} as any, config);

    const result = await service.generateKbFromTicket(
      'AD account request',
      'A user needs an account.',
      'Open AD tool and create the account.',
    );

    expect(result).toEqual({ id: 2 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/account-123/ai/run/@cf/meta/llama-3.1-8b-instruct',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      title: 'AD account creation',
      content: '## Problem\nAD access was needed.\n\n## Resolution\nCreate the account.',
      tags: 'active-directory',
    }));
  });

  it('tries the next code-defined Cloudflare model when the preferred model is unavailable', async () => {
    const repo = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue({ id: 3 }),
    } as any;
    const config = {
      get: jest.fn((key: string) => ({
        CLOUDFLARE_ACCOUNT_ID: 'account-123',
        CLOUDFLARE_API_TOKEN: 'token-123',
      } as Record<string, string | undefined>)[key]),
    } as any;
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ success: false }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: { response: '{"title":"Fallback article","content":"Problem and Resolution","tags":"fallback"}' },
        }),
      } as Response);
    const service = new KnowledgeBaseService(repo, {} as any, config);

    await expect(service.generateKbFromTicket('Issue', 'Description', 'Resolution')).resolves.toEqual({ id: 3 });
    expect(fetchMock.mock.calls[1][0]).toContain('/ai/run/@cf/zai-org/glm-4.7-flash');
  });

  it('uses Groq for knowledge base suggestions when Groq is available', async () => {
    const article = { id: 7, title: 'Printer offline', content: 'Reconnect the printer.', tags: 'printer' };
    const repo = {
      find: jest.fn().mockResolvedValue([article]),
      findOne: jest.fn().mockResolvedValue(article),
    } as any;
    const config = {
      get: jest.fn((key: string) => ({ GROQ_API_KEY: 'groq-token' } as Record<string, string | undefined>)[key]),
    } as any;
    const service = new KnowledgeBaseService(repo, {} as any, config);
    const completion = jest.fn().mockResolvedValue({
      choices: [{ message: { content: '{"ids":[7]}' } }],
    });
    (service as any).groqClient = { chat: { completions: { create: completion } } };

    await expect(service.searchKnowledgeBase('printer offline')).resolves.toEqual([article]);
    expect(completion).toHaveBeenCalledWith(expect.objectContaining({ model: 'openai/gpt-oss-120b' }));
  });

  it('uses Cloudflare to extract local search terms when Groq is unavailable', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 8 }]),
    };
    const repo = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) } as any;
    const config = {
      get: jest.fn((key: string) => ({
        CLOUDFLARE_ACCOUNT_ID: 'account-123',
        CLOUDFLARE_API_TOKEN: 'token-123',
      } as Record<string, string | undefined>)[key]),
    } as any;
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: { response: '{"keywords":["printer","offline"]}' } }),
    } as Response);
    const service = new KnowledgeBaseService(repo, {} as any, config);
    (service as any).groqClient = {
      chat: { completions: { create: jest.fn().mockRejectedValue(new Error('Groq unavailable')) } },
    };

    await expect(service.searchKnowledgeBase('Printer offline for user@example.com')).resolves.toEqual([{ id: 8 }]);
    expect(fetchMock).toHaveBeenCalled();
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).not.toContain('user@example.com');
    expect(queryBuilder.where).toHaveBeenCalledWith(expect.stringContaining('kb.title LIKE :q0'), { q0: '%printer%' });
    expect(queryBuilder.orWhere).toHaveBeenCalledWith(expect.stringContaining('kb.title LIKE :q1'), { q1: '%offline%' });
  });
});
