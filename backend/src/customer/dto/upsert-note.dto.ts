import { IsString, MaxLength } from 'class-validator';

export class UpsertNoteDto {
    @IsString()
    @MaxLength(5000)
    notes: string;
}
