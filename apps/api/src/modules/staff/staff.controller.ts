import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser } from '../../common/current-user.decorator';
import { StaffService } from './staff.service';

class CreateStaffDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) fullName!: string;
  @IsEnum(Role) role!: Role;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsString() phone?: string;
}

class UpdateStaffDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() phone?: string;
}

class ResetPasswordDto {
  @IsString() @MinLength(6) password!: string;
}

// Staff administration is restricted to owners/managers.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Controller('staff')
export class StaffController {
  constructor(private staff: StaffService) {}

  @Get()
  list(@CurrentUser('shopId') shopId: string) {
    return this.staff.list(shopId);
  }

  @Post()
  create(@CurrentUser('shopId') shopId: string, @Body() dto: CreateStaffDto) {
    return this.staff.create(shopId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(shopId, id, dto);
  }

  @Post(':id/reset-password')
  reset(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.staff.resetPassword(shopId, id, dto.password);
  }
}
