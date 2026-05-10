import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Campaign,
  CampaignStats,
  DispatchRecord,
  MessageChannel,
} from './funnel-campaign.types';
import {
  CreateCampaignDto,
  PreviewMessageDto,
  SendMessageDto,
} from './funnel-campaign.dto';

@Injectable()
export class FunnelCampaignService {
  private readonly campaigns = new Map<string, Campaign>();
  private readonly dispatches: DispatchRecord[] = [];

  createCampaign(dto: CreateCampaignDto): Campaign {
    const now = new Date().toISOString();
    const campaignId = this.nextId('cmp');

    const campaign: Campaign = {
      campaignId,
      name: dto.name,
      channel: dto.channel,
      templateId: dto.templateId,
      audienceSize: Math.max(0, dto.audienceSize ?? 0),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      stats: this.emptyStats(),
    };

    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  startCampaign(campaignId: string): Campaign {
    const campaign = this.requireCampaign(campaignId);
    const now = new Date().toISOString();

    campaign.status = 'running';
    campaign.startedAt = campaign.startedAt ?? now;
    campaign.updatedAt = now;

    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  pauseCampaign(campaignId: string): Campaign {
    const campaign = this.requireCampaign(campaignId);
    const now = new Date().toISOString();

    campaign.status = 'paused';
    campaign.pausedAt = now;
    campaign.updatedAt = now;

    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  getCampaignStats(campaignId: string): CampaignStats & {
    campaignId: string;
    status: Campaign['status'];
    updatedAt: string;
  } {
    const campaign = this.requireCampaign(campaignId);

    return {
      campaignId: campaign.campaignId,
      status: campaign.status,
      updatedAt: campaign.updatedAt,
      ...campaign.stats,
    };
  }

  previewMessage(dto: PreviewMessageDto): {
    channel: MessageChannel;
    preview: string;
  } {
    const preview = this.renderTemplate(dto.template, dto.variables);

    return {
      channel: dto.channel,
      preview,
    };
  }

  sendMessage(dto: SendMessageDto): {
    dispatch: DispatchRecord;
    result: 'accepted';
  } {
    if (dto.campaignId) {
      const campaign = this.requireCampaign(dto.campaignId);
      campaign.stats.requested += 1;
      campaign.stats.queued += 1;
      campaign.stats.sent += 1;
      campaign.stats.delivered += 1;
      campaign.updatedAt = new Date().toISOString();
      this.campaigns.set(campaign.campaignId, campaign);
    }

    const dispatch: DispatchRecord = {
      dispatchId: this.nextId('msg'),
      campaignId: dto.campaignId,
      leadId: dto.leadId,
      channel: dto.channel,
      to: dto.to,
      content: dto.content,
      status: 'sent',
      providerMessageId: this.nextId('provider'),
      createdAt: new Date().toISOString(),
    };

    this.dispatches.push(dispatch);

    return {
      dispatch,
      result: 'accepted',
    };
  }

  private renderTemplate(
    template: string,
    variables?: Record<string, string | number>,
  ): string {
    if (!variables) {
      return template;
    }

    return Object.entries(variables).reduce((content, [key, value]) => {
      const token = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      return content.replace(token, String(value));
    }, template);
  }

  private requireCampaign(campaignId: string): Campaign {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    return campaign;
  }

  private emptyStats(): CampaignStats {
    return {
      requested: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
    };
  }

  private nextId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${random}`;
  }
}
