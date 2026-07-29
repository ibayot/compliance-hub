import { PartialType } from '@nestjs/swagger';
import { CreateRoleDefinitionDto } from './create-role-definition.dto';

export class UpdateRoleDefinitionDto extends PartialType(CreateRoleDefinitionDto) {}
