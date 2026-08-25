import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateCategoryDto,
  CreateIssueTypeDto,
  CreateKeywordRuleDto,
} from './ticket-settings.service';

describe('Ticket Settings create DTOs', () => {
  it.each([
    [CreateCategoryDto, { name: 'Hardware', isDesktop: true, isActive: false }],
    [CreateKeywordRuleDto, {
      keywords: ['vpn'],
      targetTicketType: 'it_support',
      targetCategoryId: 'category-1',
      isActive: false,
    }],
    [CreateIssueTypeDto, {
      name: 'VPN access',
      categoryId: 'category-1',
      slaHours: 24,
      isActive: false,
    }],
  ])('accepts the active status sent by the create form', async (Dto, payload) => {
    const errors = await validate(plainToInstance(Dto as any, payload));
    expect(errors).toHaveLength(0);
  });
});
