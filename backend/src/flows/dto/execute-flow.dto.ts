import { IsObject, IsOptional } from 'class-validator';

export class ExecuteFlowDto {
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;
}