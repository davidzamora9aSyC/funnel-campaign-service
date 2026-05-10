import { Campaign, CampaignStats, DispatchRecord, MessageChannel } from './funnel-campaign.types';
import { CreateCampaignDto, PreviewMessageDto, SendMessageDto } from './funnel-campaign.dto';
export declare class FunnelCampaignService {
    private readonly campaigns;
    private readonly dispatches;
    createCampaign(dto: CreateCampaignDto): Campaign;
    startCampaign(campaignId: string): Campaign;
    pauseCampaign(campaignId: string): Campaign;
    getCampaignStats(campaignId: string): CampaignStats & {
        campaignId: string;
        status: Campaign['status'];
        updatedAt: string;
    };
    previewMessage(dto: PreviewMessageDto): {
        channel: MessageChannel;
        preview: string;
    };
    sendMessage(dto: SendMessageDto): {
        dispatch: DispatchRecord;
        result: 'accepted';
    };
    private renderTemplate;
    private requireCampaign;
    private emptyStats;
    private nextId;
}
