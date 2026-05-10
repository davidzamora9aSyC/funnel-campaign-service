import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { FunnelCampaignService } from './funnel-campaign.service';
import {
  CreateCampaignDto,
  PreviewMessageDto,
  SendMessageDto,
} from './funnel-campaign.dto';

@Controller()
export class FunnelCampaignController {
  constructor(private readonly funnelCampaignService: FunnelCampaignService) {}

  @Post('/funnel/campaigns')
  createCampaign(@Body() body: CreateCampaignDto) {
    return this.funnelCampaignService.createCampaign(body);
  }

  @Post('/funnel/campaigns/:campaignId/start')
  startCampaign(@Param('campaignId') campaignId: string) {
    return this.funnelCampaignService.startCampaign(campaignId);
  }

  @Post('/funnel/campaigns/:campaignId/pause')
  pauseCampaign(@Param('campaignId') campaignId: string) {
    return this.funnelCampaignService.pauseCampaign(campaignId);
  }

  @Get('/funnel/campaigns/:campaignId/stats')
  getCampaignStats(@Param('campaignId') campaignId: string) {
    return this.funnelCampaignService.getCampaignStats(campaignId);
  }

  @Post('/funnel/messages/preview')
  previewMessage(@Body() body: PreviewMessageDto) {
    return this.funnelCampaignService.previewMessage(body);
  }

  @Post('/funnel/messages/send')
  sendMessage(@Body() body: SendMessageDto) {
    return this.funnelCampaignService.sendMessage(body);
  }
}
