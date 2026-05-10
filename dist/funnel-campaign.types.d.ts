export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed';
export type MessageChannel = 'email' | 'whatsapp';
export interface Campaign {
    campaignId: string;
    name: string;
    channel: MessageChannel;
    templateId?: string;
    audienceSize: number;
    status: CampaignStatus;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    pausedAt?: string;
    stats: CampaignStats;
}
export interface CampaignStats {
    requested: number;
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
}
export interface DispatchRecord {
    dispatchId: string;
    campaignId?: string;
    leadId?: string;
    channel: MessageChannel;
    to: string;
    content: string;
    status: 'queued' | 'sent';
    providerMessageId: string;
    createdAt: string;
}
