import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { InventoryController } from './inventory.controller';

@Module({
  controllers: [InventoryController],
  providers: [ProductService],
  exports: [ProductService],
})
export class InventoryModule {}
