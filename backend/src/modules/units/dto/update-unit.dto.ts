import { PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { CreateUnitDto } from './create-unit.dto';

export class UpdateUnitDto extends PartialType(CreateUnitDto) {}
