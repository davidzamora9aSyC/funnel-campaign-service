import { MessageChannel } from './funnel-campaign.types';
export interface CreateCampaignDto {
    name: string;
    channel: MessageChannel;
    templateId?: string;
    audienceSize?: number;
}
export interface PreviewMessageDto {
    channel: MessageChannel;
    template: string;
    variables?: Record<string, string | number>;
}
export interface SendMessageDto {
    campaignId?: string;
    leadId?: string;
    channel: MessageChannel;
    to: string;
    content: string;
}
