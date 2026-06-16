import { IsIn } from 'class-validator';

export class UpdateFeedbackStatusDto {
  @IsIn(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}
