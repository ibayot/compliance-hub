import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDefinitionDto } from './create-role-definition.dto';

export class UpdateRoleDefinitionDto extends PartialType(CreateRoleDefinitionDto) {}
