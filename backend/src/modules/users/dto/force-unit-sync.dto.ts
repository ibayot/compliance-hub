import { Equals } from 'class-validator';

export class ForceUnitSyncDto {
  // Keep the raw type so implicit conversion cannot turn the string "false" into true.
  @Equals(true, {
    message: 'Refresh the application and confirm force unit synchronization.',
  })
  force!: unknown;
}
