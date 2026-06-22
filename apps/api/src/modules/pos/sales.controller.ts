import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private sales: SalesService) {}

  @Post()
  create(@CurrentUser('shopId') shopId: string, @Body() dto: CreateSaleDto) {
    return this.sales.createSale(shopId, dto);
  }

  @Get()
  list(@CurrentUser('shopId') shopId: string) {
    return this.sales.list(shopId);
  }

  @Get(':id')
  findOne(@CurrentUser('shopId') shopId: string, @Param('id') id: string) {
    return this.sales.findOne(shopId, id);
  }
}
