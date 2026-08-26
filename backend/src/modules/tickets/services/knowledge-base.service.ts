import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KnowledgeArticle } from '../entities/knowledge-article.entity';
import { TicketIssueType } from '../entities/ticket-issue-type.entity';
import OpenAI from 'openai';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private groqClient: OpenAI | null = null;
  private readonly groqModel = 'openai/gpt-oss-120b';
  private cloudflareAccountId: string | null = null;
  private cloudflareApiToken: string | null = null;
  // Model selection is maintained in code. If a model is unavailable, the next
  // current candidate is tried without requiring a deployment-time setting change.
  private readonly cloudflareModels = [
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/zai-org/glm-4.7-flash',
    '@cf/google/gemma-4-26b-a4b-it',
  ];

  constructor(
    @InjectRepository(KnowledgeArticle)
    private readonly kbRepo: Repository<KnowledgeArticle>,
    @InjectRepository(TicketIssueType)
    private readonly issueRepo: Repository<TicketIssueType>,
    private readonly configService: ConfigService,
  ) {
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (groqKey) {
      this.groqClient = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      this.logger.log('Groq Client initialized for KB Suggestions.');
    } else {
      this.logger.warn('GROQ_API_KEY is not set. Real-time KB suggestions will be disabled.');
    }

    this.cloudflareAccountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID')?.trim() || null;
    this.cloudflareApiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN')?.trim() || null;
    if (this.cloudflareAccountId && this.cloudflareApiToken) {
      this.logger.log('Cloudflare Workers AI configured for KB generation.');
    } else {
      this.logger.warn('Cloudflare Workers AI is not configured.');
    }
  }

  // Very basic regex-based stripping of sensitive data before prompt
  private async stripSensitiveData(text: string): Promise<string> {
    if (!text) return '';
    let clean = text;

    // Fetch all users to scrub their names and emails
    try {
      const users = await this.kbRepo.manager.query(
        'SELECT first_name, last_name, email FROM users',
      );
      for (const user of users) {
        if (user.first_name && user.first_name.length > 2) {
          const fnRegex = new RegExp(`\\b${this.escapeRegExp(user.first_name)}\\b`, 'gi');
          clean = clean.replace(fnRegex, '[NAME_REMOVED]');
        }
        if (user.last_name && user.last_name.length > 2) {
          const lnRegex = new RegExp(`\\b${this.escapeRegExp(user.last_name)}\\b`, 'gi');
          clean = clean.replace(lnRegex, '[NAME_REMOVED]');
        }
        if (user.email && user.email.length > 5) {
          const emRegex = new RegExp(this.escapeRegExp(user.email), 'gi');
          clean = clean.replace(emRegex, '[EMAIL_REMOVED]');
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch users for PII scrubbing: ${err?.message}`);
    }

    // Strip generic emails
    clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REMOVED]');
    // Strip phone numbers (basic PH/US formats)
    clean = clean.replace(/\+?[0-9]{10,13}/g, '[PHONE_REMOVED]');
    return clean;
  }

  private escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private normalizeAiText(value: unknown, fallback = ''): string {
    let text = typeof value === 'string'
      ? value
      : value == null
        ? fallback
        : JSON.stringify(value);
    text = text.trim();
    const fenced = text.match(/^```(?:json|markdown|md|text)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) text = fenced[1].trim();
    return text
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"');
  }

  private parseAiJson(responseText: string): Record<string, any> {
    const unfenced = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonStart = unfenced.indexOf('{');
    const jsonEnd = unfenced.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error('AI provider returned no JSON result.');
    return JSON.parse(unfenced.slice(jsonStart, jsonEnd + 1));
  }

  async generateKbFromTicket(
    subject: string,
    description: string,
    resolutionNotes: string,
    categoryId?: string,
  ): Promise<KnowledgeArticle | null> {
    if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
      throw new Error('No AI provider was able to generate the Knowledge Base article.');
    }

    const cleanSubject = (await this.stripSensitiveData(subject)).trim();
    const cleanDescription = (await this.stripSensitiveData(description)).trim();
    const cleanResolution = (await this.stripSensitiveData(resolutionNotes)).trim();
    const prompt = [
      'Create a practical, human-readable technical knowledge base article from this resolved support ticket.',
      'Return only valid JSON with exactly these fields: title, content, tags.',
      'Use a specific root-cause or task-oriented title under 255 characters; do not copy a vague ticket subject unchanged.',
      'The content must use this exact Markdown structure: **Problem:**, **Solution:**, and **Result:**.',
      'Problem must explain the symptom and likely cause in one clear paragraph.',
      'Solution must be a numbered list. Give every step a short bold action title followed by a clear instruction.',
      'Result must state the expected outcome and how the reader can verify success.',
      'Rewrite brief resolution notes into complete, understandable instructions, but never invent unsupported commands or technical facts.',
      'Preserve every exact command, menu path, registry path, filename, and configuration value supplied by the ticket.',
      'Generalize personal names, usernames, machine names, and office locations.',
      'Tags must be a comma-separated list of 3 to 7 concise technical topics, not JSON arrays.',
      'Do not include personal names, email addresses, locations, credentials, or other sensitive data.',
      `Subject: ${cleanSubject}`,
      `Description: ${cleanDescription}`,
      `Resolution Notes: ${cleanResolution}`,
    ].join('\n');
    const responseText = await this.requestCloudflare(prompt);
    const article = this.parseAiJson(responseText);
    const title = this.normalizeAiText(article.title, cleanSubject || 'Resolved Ticket Knowledge Base Article');
    const content = this.normalizeAiText(article.content, [
      '**Problem:**', cleanDescription || 'A support issue was reported.', '',
      '**Solution:**', `1. ${cleanResolution || 'Apply the verified resolution provided by the support team.'}`, '',
      '**Result:**', 'Confirm that the reported issue no longer occurs.',
    ].join('\n'));
    const tags = this.normalizeAiText(article.tags, 'ticket-resolution');
    return this.kbRepo.save(this.kbRepo.create({
      title: title.slice(0, 255),
      content,
      tags: tags.slice(0, 255),
    }));
  }

  private async requestCloudflare(prompt: string): Promise<string> {
    let lastError: (Error & { status?: number }) | null = null;
    for (const model of this.cloudflareModels) {
      const modelPath = model.split('/').map((part) => encodeURIComponent(part).replace(/%40/g, '@')).join('/');
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.cloudflareAccountId!)}/ai/run/${modelPath}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, max_tokens: 1200, temperature: 0.2 }),
      });
      const payload: any = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        const error = new Error(`Cloudflare Workers AI request failed with status ${response.status}`) as Error & { status?: number };
        error.status = response.status;
        lastError = error;
        if ([400, 403, 404].includes(response.status) && model !== this.cloudflareModels[this.cloudflareModels.length - 1]) {
          this.logger.warn(`Cloudflare Workers AI model unavailable (${response.status}); trying the next code-defined model.`);
          continue;
        }
        throw error;
      }
      const rawResponse = payload?.result?.response ?? payload?.result?.text ?? payload?.result;
      const responseText = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse ?? '');
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error('Cloudflare Workers AI returned no JSON article.');
      return responseText.slice(jsonStart, jsonEnd + 1);
    }
    throw lastError || new Error('Cloudflare Workers AI did not return a result.');
  }

  async getKnowledgeBaseArticles(): Promise<KnowledgeArticle[]> {
    return this.kbRepo.find({ order: { helpfulCount: 'DESC' } });
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeArticle[]> {
    try {
      if (!this.groqClient) throw new Error('Groq is not configured');
      const allKbs = await this.getKnowledgeBaseArticles();
      const kbListText = allKbs
        .map((kb) => `ID: ${kb.id}\nTitle: ${kb.title}\nTags: ${kb.tags || 'None'}\nContent: ${kb.content}\n---`)
        .join('\n');

      const prompt = `
Given the user's issue description: "${query}"
Which of the following Knowledge Base articles are HIGHLY relevant and helpful to solve this exact issue?
List the IDs of the top 3 most relevant articles as a JSON object containing an array of numbers under the key "ids".
CRITICAL: Do NOT guess. If the issue description is vague (e.g., "Test 2"), or if there are no articles that directly and explicitly address the problem, you MUST output an empty array for "ids".

Articles:
${kbListText}

Output strictly JSON:
{ "ids": [1, 2, 3] }
`;

      const response = await this.groqClient.chat.completions.create({
        model: this.groqModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const responseText = response.choices[0]?.message?.content || '{"ids": []}';
      const parsed = this.parseAiJson(responseText);
      const topIds = parsed.ids || [];

      if (!Array.isArray(topIds) || topIds.length === 0) {
        return [];
      }

      // Fetch the actual articles
      const results = [];
      for (const id of topIds) {
        const kb = await this.kbRepo.findOne({ where: { id } });
        if (kb) results.push(kb);
      }
      return results;
    } catch (err) {
      this.logger.warn('Groq KB suggestion search failed; trying Cloudflare Workers AI.');
      try {
        return await this.searchWithCloudflare(query);
      } catch (cloudflareError) {
        this.logger.warn('Cloudflare KB suggestion search failed; using local search.');
        return this.searchLocally(query);
      }
    }
  }

  private async searchWithCloudflare(query: string): Promise<KnowledgeArticle[]> {
    if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
      throw new Error('Cloudflare Workers AI is not configured');
    }
    const cleanQuery = (await this.stripSensitiveData(query)).trim();
    const prompt = [
      'Extract up to eight precise technical search keywords from this support issue.',
      'Return only valid JSON in this format: {"keywords":["keyword one","keyword two"]}.',
      'Do not include names, email addresses, locations, credentials, or other sensitive data.',
      `Support issue: ${cleanQuery}`,
    ].join('\n');
    const parsed = this.parseAiJson(await this.requestCloudflare(prompt));
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
        .filter((keyword: unknown): keyword is string => typeof keyword === 'string' && keyword.trim() !== '')
        .map((keyword) => this.normalizeAiText(keyword))
        .filter((keyword) => keyword !== '')
        .slice(0, 8)
      : [];
    return this.searchLocally(query, keywords);
  }

  private searchLocally(query: string, terms: string[] = []): Promise<KnowledgeArticle[]> {
    const searchTerms = terms.length > 0 ? terms : [query];
    const queryBuilder = this.kbRepo.createQueryBuilder('kb');
    searchTerms.forEach((term, index) => {
      const parameter = `q${index}`;
      const clause = `kb.title LIKE :${parameter} OR kb.content LIKE :${parameter} OR kb.tags LIKE :${parameter}`;
      const parameters = { [parameter]: `%${term}%` };
      if (index === 0) queryBuilder.where(clause, parameters);
      else queryBuilder.orWhere(clause, parameters);
    });
    return queryBuilder.getMany();
  }

  async rateArticle(id: number, isHelpful: boolean): Promise<KnowledgeArticle> {
    const article = await this.kbRepo.findOne({ where: { id } });
    if (!article) throw new Error('Article not found');

    if (isHelpful) {
      article.helpfulCount += 1;
    } else {
      article.unhelpfulCount += 1;
    }
    return this.kbRepo.save(article);
  }

  async updateArticle(
    id: number,
    dto: { title: string; tags: string; content: string },
  ): Promise<KnowledgeArticle> {
    const article = await this.kbRepo.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    article.title = dto.title;
    article.tags = dto.tags;
    article.content = dto.content;
    return this.kbRepo.save(article);
  }
}
