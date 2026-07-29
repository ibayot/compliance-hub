import { PartialType } from '@nestjs/swagger';
import { CreateMovArtifactDto } from './create-mov-artifact.dto';

export class UpdateMovArtifactDto extends PartialType(CreateMovArtifactDto) {}
