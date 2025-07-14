import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateFlowDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  nodes: any[];

  @IsArray()
  edges: any[];

  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @IsObject()
  @IsOptional()
  browserSettings?: any;

  @IsObject()
  @IsOptional()
  apiConfig?: any;
}