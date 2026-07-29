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
  private cerebrasClient: OpenAI | null = null;

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

    const cerebrasKey = this.configService.get<string>('CEREBRAS_API_KEY');
    if (cerebrasKey) {
      this.cerebrasClient = new OpenAI({
        apiKey: cerebrasKey,
        baseURL: 'https://api.cerebras.ai/v1',
      });
      this.logger.log('Cerebras Client initialized for KB Generation.');
    } else {
      this.logger.warn('CEREBRAS_API_KEY is not set. KB generation will be disabled.');
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

  async generateKbFromTicket(
    subject: string,
    description: string,
    resolutionNotes: string,
    categoryId?: string,
  ): Promise<KnowledgeArticle | null> {
    if (!this.cerebrasClient) {
      this.logger.warn('Cannot generate KB because Cerebras client is not configured.');
      return null;
    }

    try {
      const cleanSubject = await this.stripSensitiveData(subject);
      const cleanDesc = await this.stripSensitiveData(description);
      const cleanNotes = await this.stripSensitiveData(resolutionNotes);

      // Fetch all existing KBs to pass to the prompt for duplicate checking
      // (If the KB grows huge, we'd need vector search, but for now we just fetch titles and IDs)
      const existingKbs = await this.kbRepo.find({ select: ['id', 'title', 'content'] });
      const kbListText = existingKbs
        .map((kb) => `ID: ${kb.id}\nTitle: ${kb.title}\nContent: ${kb.content}\n---`)
        .join('\n');

      let issueContext = '';
      if (categoryId) {
        const issues = await this.issueRepo.find({ where: { category_id: categoryId, isActive: true } });
        if (issues.length > 0) {
          issueContext = `\nKnown Issues for this category:\n${issues.map((iss) => `- ID: ${iss.id} | Name: ${iss.name} | Desc: ${iss.description || ''}`).join('\n')}\nIf the resolution matches one of these specific issues, ensure the KB is focused on that single issue. Assess if the KB is an update of the single issue KB or a multiple-issue KB.`;
        }
      }

      const prompt = `
You are an expert IT Helpdesk Knowledge Base article generator.
We have a resolved ticket with the following details:
Subject: ${cleanSubject}
Description: ${cleanDesc}
Resolution Notes: ${cleanNotes}
${issueContext}

We want to add this to our Knowledge Base.
However, we want to keep our KB clean and avoid duplicates.
Here are the existing KB articles:
${kbListText}

Task:
1. Determine if this new ticket addresses the exact same specific root problem/error as an existing KB article. (e.g., "Printer Paper Jam" and "Printer Ink Pad Error" are completely DIFFERENT problems and must NOT be merged. However, two different ways to solve a "Paper Jam" ARE the same problem and should be merged).
2. If it IS the exact same problem AND the resolution steps are fundamentally the same (or very closely similar in nature), set action to "IGNORE".
3. If it IS the exact same problem BUT the resolution steps offer a new or different alternative solution, set action to "UPDATE" and provide the existing ID and the new appended content.
4. If it is NOT the exact same problem, set action to "CREATE" and provide a highly specific title, detailed content, and tags.
5. Identify if the resolution aligns with any provided known issue. If yes, output its ID as 'matched_issue_id'. If it does not match ANY provided issues and represents a completely new issue type, output a concise 2-4 word name as 'suggested_new_issue_name' and a brief description as 'suggested_new_issue_description'.

CRITICAL INSTRUCTION FOR CONTENT GENERATION:
- For CREATE: Make the title highly specific to the actual root cause or error (e.g., "Resolving Printer Paper Jams" instead of just "Printer Issue"). Rewrite the resolution into a clear, easy-to-follow, step-by-step guide that ANY general user can understand. Explain the concepts simply, BUT you MUST retain any exact technical commands, file paths, or specific values (e.g., "ipconfig /flushdns", "8.8.8.8") that the user actually needs to type, click, or search for. Do not oversimplify essential actionable instructions.
- For UPDATE: You MUST rewrite the NEW alternative solution into a clear, easy-to-follow format, retaining exact technical commands. The appended alternative solution MUST be formatted as a numbered list (1., 2., 3...) under a clear heading (e.g., "### Alternative Solution"). Do NOT output the original content. ONLY output the new formatted alternative solution.
- GENERALIZATION: You MUST strip out any specific locations (e.g., "Floor 2", "HR Office", "Conference Room"), usernames, or specific machine names. A KB article must be universally applicable. A title should be "Resolving a Paper Jam in Tray 2", NOT "Resolving a Paper Jam on Floor 2". The content should never mention where the printer is located.
`;

      const response = await this.cerebrasClient.chat.completions.create({
        model: 'gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'kb_decision',
            schema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['CREATE', 'UPDATE', 'IGNORE']
                },
                title: { type: 'string', description: "Title for CREATE action, otherwise empty string" },
                content: { type: 'string', description: "Content for CREATE action, otherwise empty string" },
                tags: { type: 'string', description: "Tags for CREATE action, otherwise empty string" },
                existing_id: { type: 'integer', description: "ID for UPDATE action, otherwise 0" },
                appended_content: { type: 'string', description: "The new alternative solution for UPDATE action, otherwise empty string" },
                matched_issue_id: { type: 'string', description: "The ID of the matched Known Issue, or null/empty if none match" },
                suggested_new_issue_name: { type: 'string', description: "If no issue matches, provide a 2-4 word name for a new issue type" },
                suggested_new_issue_description: { type: 'string', description: "If no issue matches, provide a brief description for the new issue type" }
              },
              required: ['action', 'title', 'content', 'tags', 'existing_id', 'appended_content']
            }
          }
        }
      });

      const responseText = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);

      // Handle Dynamic Issue Creation
      if (categoryId && !parsed.matched_issue_id && parsed.suggested_new_issue_name && parsed.suggested_new_issue_name.trim() !== '') {
         const newKey = parsed.suggested_new_issue_name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Date.now() / 1000);
          const newIssue = this.issueRepo.create({
            key: newKey,
            name: parsed.suggested_new_issue_name,
            description: parsed.suggested_new_issue_description || 'Dynamically added from KB Generation',
            category_id: categoryId,
            isActive: true,
            isDeleted: false
          });
         await this.issueRepo.save(newIssue);
         this.logger.log(`Dynamically created new Issue Type: ${newIssue.name}`);
      }

      if (parsed.action === 'CREATE') {
        const newKb = this.kbRepo.create({
          title: parsed.title,
          content: parsed.content,
          tags: parsed.tags,
        });
        return this.kbRepo.save(newKb);
      } else if (parsed.action === 'UPDATE' && parsed.existing_id) {
        const existing = await this.kbRepo.findOne({ where: { id: parsed.existing_id } });
        if (existing) {
          existing.content = existing.content + '\n\n---\n\n' + parsed.appended_content;
          return this.kbRepo.save(existing);
        }
      } else if (parsed.action === 'IGNORE') {
        this.logger.log('KB Generation ignored - exact duplicate found.');
        return null;
      }
      return null;
    } catch (err: any) {
      this.logger.error('Failed to generate KB article using Cerebras', err);
      // Re-throw so the ticket service catches it and benches the KB
      throw err;
    }
  }

  async getKnowledgeBaseArticles(): Promise<KnowledgeArticle[]> {
    return this.kbRepo.find({ order: { helpfulCount: 'DESC' } });
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeArticle[]> {
    if (!this.groqClient) {
      // fallback to simple DB search if no Groq
      return this.kbRepo
        .createQueryBuilder('kb')
        .where('kb.title LIKE :q OR kb.content LIKE :q OR kb.tags LIKE :q', { q: `%${query}%` })
        .getMany();
    }

    // Semantic search using Groq
    try {
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
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const responseText = response.choices[0]?.message?.content || '{"ids": []}';
      const parsed = JSON.parse(responseText);
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
      this.logger.error('Failed to semantic search KB using Groq', err);
      // fallback to DB search
      return this.kbRepo
        .createQueryBuilder('kb')
        .where('kb.title LIKE :q OR kb.content LIKE :q', { q: `%${query}%` })
        .getMany();
    }
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
