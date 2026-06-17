import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KnowledgeArticle } from '../entities/knowledge-article.entity';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    @InjectRepository(KnowledgeArticle)
    private readonly kbRepo: Repository<KnowledgeArticle>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY is not set. KB generation will be disabled.');
    }
  }

  // Very basic regex-based stripping of sensitive data before prompt
  private stripSensitiveData(text: string): string {
    if (!text) return '';
    let clean = text;
    // Strip emails
    clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REMOVED]');
    // Strip phone numbers (basic PH/US formats)
    clean = clean.replace(/\+?[0-9]{10,13}/g, '[PHONE_REMOVED]');
    return clean;
  }

  async generateKbFromTicket(
    subject: string,
    description: string,
    resolutionNotes: string,
    resolutionSteps: string,
  ): Promise<KnowledgeArticle | null> {
    if (!this.genAI) return null;

    try {
      const cleanSubject = this.stripSensitiveData(subject);
      const cleanDesc = this.stripSensitiveData(description);
      const cleanNotes = this.stripSensitiveData(resolutionNotes);
      const cleanSteps = this.stripSensitiveData(resolutionSteps);

      // Fetch all existing KBs to pass to the prompt for duplicate checking
      // (If the KB grows huge, we'd need vector search, but for now we just fetch titles and IDs)
      const existingKbs = await this.kbRepo.find({ select: ['id', 'title', 'content'] });
      const kbListText = existingKbs.map(kb => `ID: ${kb.id}\nTitle: ${kb.title}\nContent: ${kb.content}\n---`).join('\n');

      const prompt = `
You are an expert IT Helpdesk Knowledge Base article generator.
We have a resolved ticket with the following details:
Subject: ${cleanSubject}
Description: ${cleanDesc}
Resolution Notes: ${cleanNotes}
Resolution Steps: ${cleanSteps}

We want to add this to our Knowledge Base.
However, we want to keep our KB clean and avoid duplicates.
Here are the existing KB articles:
${kbListText}

Task:
1. Determine if this new ticket resolution is a duplicate of an existing KB article based on the problem (Subject/Description).
2. If it IS a duplicate problem but the resolution steps are different, output a JSON indicating we should UPDATE the existing KB by merging the new solution as an alternative.
3. If it is NOT a duplicate, output a JSON indicating we should CREATE a new KB article.

Output ONLY valid JSON with no markdown wrapping, in one of these two formats:
Format for CREATE:
{
  "action": "CREATE",
  "title": "A concise, general title for the problem",
  "content": "A clear, step-by-step guide on how to resolve the issue, written for an IT technician. Include alternative solutions if applicable.",
  "tags": "comma,separated,tags"
}

Format for UPDATE:
{
  "action": "UPDATE",
  "existing_id": <number>,
  "merged_content": "The original content of the existing KB, updated nicely to include this new alternative resolution method."
}
`;

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
      
      const parsed = JSON.parse(responseText);

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
          existing.content = parsed.merged_content;
          return this.kbRepo.save(existing);
        }
      }
      return null;
    } catch (err: any) {
      this.logger.error('Failed to generate KB article using Gemini', err);
      return null;
    }
  }

  async getKnowledgeBaseArticles(): Promise<KnowledgeArticle[]> {
    return this.kbRepo.find({ order: { helpfulCount: 'DESC' } });
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeArticle[]> {
    if (!this.genAI) {
       // fallback to simple DB search if no Gemini
       return this.kbRepo.createQueryBuilder('kb')
         .where('kb.title LIKE :q OR kb.content LIKE :q', { q: `%${query}%` })
         .getMany();
    }
    
    // Semantic search using Gemini
    try {
      const allKbs = await this.getKnowledgeBaseArticles();
      const kbListText = allKbs.map(kb => `ID: ${kb.id}\nTitle: ${kb.title}\nContent: ${kb.content}\n---`).join('\n');
      
      const prompt = `
Given the user's issue description: "${query}"
Which of the following Knowledge Base articles might be helpful?
List the IDs of the top 3 most relevant articles as a JSON array of numbers. Output ONLY the JSON array.
If none are relevant, output an empty array [].

Articles:
${kbListText}
`;
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
      
      const parsedIds = JSON.parse(responseText);
      if (Array.isArray(parsedIds) && parsedIds.length > 0) {
        return allKbs.filter(kb => parsedIds.includes(kb.id));
      }
      return [];
    } catch (err) {
       this.logger.error('Failed to search KB using Gemini', err);
       return this.kbRepo.createQueryBuilder('kb')
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
}
