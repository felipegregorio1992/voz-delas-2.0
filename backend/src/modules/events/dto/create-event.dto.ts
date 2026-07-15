import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsDateString, Min } from 'class-validator';

export enum EventCategoryDto {
  COURSE = 'COURSE',
  WORKSHOP = 'WORKSHOP',
  PHYSICAL_ACTIVITY = 'PHYSICAL_ACTIVITY',
  CULTURAL = 'CULTURAL',
  HEALTH = 'HEALTH',
  ENTREPRENEURSHIP = 'ENTREPRENEURSHIP',
  OTHER = 'OTHER',
}

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EventCategoryDto)
  category: EventCategoryDto;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxSlots?: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurringDays?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  program?: string;
}
