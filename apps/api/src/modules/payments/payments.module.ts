import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { EsewaProvider, FonepayProvider, ManualProvider } from './providers';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, ManualProvider, FonepayProvider, EsewaProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
