import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class QueryDto {
  @IsString()
  @IsNotEmpty()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, {
    message: 'Question is too long — keep it under 1000 characters.',
  })
  question!: string;
}
