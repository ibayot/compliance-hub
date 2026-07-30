import { PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { CreateMovArtifactDto } from './create-mov-artifact.dto';

export class UpdateMovArtifactDto extends PartialType(CreateMovArtifactDto) {}
