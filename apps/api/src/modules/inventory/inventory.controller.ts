import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class InventoryController {
  constructor(private products: ProductService) {}

  @Get()
  list(@CurrentUser('shopId') shopId: string, @Query('search') search?: string) {
    return this.products.list(shopId, search);
  }

  @Get('valuation')
  valuation(@CurrentUser('shopId') shopId: string) {
    return this.products.valuation(shopId);
  }

  @Get('lookup/:code')
  lookup(@CurrentUser('shopId') shopId: string, @Param('code') code: string) {
    return this.products.findByCode(shopId, code);
  }

  @Post()
  create(@CurrentUser('shopId') shopId: string, @Body() dto: CreateProductDto) {
    return this.products.create(shopId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(shopId, id, dto);
  }
}
