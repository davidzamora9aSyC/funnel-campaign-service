import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { FunnelCampaignController } from './funnel-campaign.controller';
import { FunnelCampaignService } from './funnel-campaign.service';

@Module({
  imports: [],
  controllers: [HealthController, FunnelCampaignController],
  providers: [FunnelCampaignService],
})
export class AppModule {}
