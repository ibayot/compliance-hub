import { PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { CreateRoleDefinitionDto } from './create-role-definition.dto';

export class UpdateRoleDefinitionDto extends PartialType(CreateRoleDefinitionDto) {}
