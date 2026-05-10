import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TemplatesController } from './templates/templates.controller';
import { TemplatesService } from './templates/templates.service';
import { ExperimentsController } from './experiments/experiments.controller';
import { ExperimentsService } from './experiments/experiments.service';
import { FunnelEventClient } from './integrations/funnel-event.client';
import { CommunicationClient } from './integrations/communication.client';
import { DispatchWorker } from './worker/dispatch.worker';

@Module({
  imports: [],
  controllers: [HealthController, TemplatesController, ExperimentsController],
  providers: [
    TemplatesService,
    ExperimentsService,
    FunnelEventClient,
    CommunicationClient,
    DispatchWorker,
  ],
})
export class AppModule {}
