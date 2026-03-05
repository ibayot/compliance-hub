import { PartialType } from '@nestjs/mapped-types';
import { CreateMovArtifactDto } from './create-mov-artifact.dto';

export class UpdateMovArtifactDto extends PartialType(CreateMovArtifactDto) {}
