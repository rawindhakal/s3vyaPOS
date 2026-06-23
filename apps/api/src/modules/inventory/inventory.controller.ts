import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { ProductService } from './product.service';
import { RecipeService } from './recipe.service';
import { StockService } from './stock.service';
import { CreateProductDto, UpdateProductDto } from './dto';

class CategoryDto {
  @IsString() @MinLength(1) name!: string;
}
class RecipeComponentDto {
  @IsString() componentId!: string;
  @IsNumber() @Min(0.001) quantity!: number;
}
class SetRecipeDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => RecipeComponentDto)
  components!: RecipeComponentDto[];
}
class VariationDto {
  @IsString() @MinLength(1) name!: string;
  @IsNumber() @Min(0) salePrice!: number;
  @IsOptional() @IsString() sku?: string;
}
class SetVariationsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => VariationDto)
  variations!: VariationDto[];
}
class AdjustDto {
  @IsNumber() delta!: number;
  @IsOptional() @IsString() reason?: string;
}
class WasteDto {
  @IsNumber() @Min(0.001) quantity!: number;
  @IsOptional() @IsString() reason?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('products')
export class InventoryController {
  constructor(
    private products: ProductService,
    private recipes: RecipeService,
    private stock: StockService,
  ) {}

  @Get()
  list(@CurrentUser('shopId') shopId: string, @Query('search') search?: string) {
    return this.products.list(shopId, search);
  }

  @Get('categories')
  listCategories(@CurrentUser('shopId') shopId: string) {
    return this.products.listCategories(shopId);
  }

  @Post('categories')
  createCategory(@CurrentUser('shopId') shopId: string, @Body() dto: CategoryDto) {
    return this.products.createCategory(shopId, dto.name);
  }

  @Patch('categories/:id')
  updateCategory(@CurrentUser('shopId') shopId: string, @Param('id') id: string, @Body() dto: CategoryDto) {
    return this.products.updateCategory(shopId, id, dto.name);
  }

  @Get('valuation')
  valuation(@CurrentUser('shopId') shopId: string) {
    return this.products.valuation(shopId);
  }

  @Get('reports/food-cost')
  foodCost(@CurrentUser('shopId') shopId: string) {
    return this.recipes.foodCostReport(shopId);
  }

  @Get('stock/low')
  lowStock(@CurrentUser('shopId') shopId: string) {
    return this.stock.lowStock(shopId);
  }

  @Get('stock/movements')
  movements(@CurrentUser('shopId') shopId: string, @Query('productId') productId?: string) {
    return this.stock.movements(shopId, productId);
  }

  @Get('lookup/:code')
  lookup(@CurrentUser('shopId') shopId: string, @Param('code') code: string) {
    return this.products.findByCode(shopId, code);
  }

  @Get(':id/recipe')
  getRecipe(@CurrentUser('shopId') shopId: string, @Param('id') id: string) {
    return this.recipes.getRecipe(shopId, id);
  }

  @Put(':id/recipe')
  setRecipe(@CurrentUser('shopId') shopId: string, @Param('id') id: string, @Body() dto: SetRecipeDto) {
    return this.recipes.setRecipe(shopId, id, dto.components);
  }

  @Get(':id/variations')
  getVariations(@CurrentUser('shopId') shopId: string, @Param('id') id: string) {
    return this.products.listVariations(shopId, id);
  }

  @Put(':id/variations')
  setVariations(@CurrentUser('shopId') shopId: string, @Param('id') id: string, @Body() dto: SetVariationsDto) {
    return this.products.setVariations(shopId, id, dto.variations);
  }

  @Post(':id/adjust')
  adjust(@CurrentUser('shopId') shopId: string, @Param('id') id: string, @Body() dto: AdjustDto) {
    return this.stock.adjust(shopId, id, dto.delta, dto.reason);
  }

  @Post(':id/waste')
  waste(@CurrentUser('shopId') shopId: string, @Param('id') id: string, @Body() dto: WasteDto) {
    return this.stock.waste(shopId, id, dto.quantity, dto.reason);
  }

  @Post()
  create(@CurrentUser('shopId') shopId: string, @Body() dto: CreateProductDto) {
    return this.products.create(shopId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('shopId') shopId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(shopId, id, dto);
  }
}
