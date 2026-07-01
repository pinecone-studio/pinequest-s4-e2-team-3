import { IsOptional, IsString, MaxLength } from "class-validator";

// Only fields a user may edit on their own profile. Deliberately excludes
// id, supabaseId and email — those aren't user-editable via this endpoint.
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;
}
