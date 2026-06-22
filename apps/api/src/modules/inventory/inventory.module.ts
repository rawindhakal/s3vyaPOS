import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { ProductService } from './product.service';
import { RecipeService } from './recipe.service';
import { StockService } from './stock.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [AccountingModule],
  controllers: [InventoryController],
  providers: [ProductService, RecipeService, StockService],
  exports: [ProductService],
})
export class InventoryModule {}
