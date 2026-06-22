import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { EsewaProvider, FonepayProvider, ManualProvider } from './providers';

@Module({
  providers: [PaymentsService, ManualProvider, FonepayProvider, EsewaProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
