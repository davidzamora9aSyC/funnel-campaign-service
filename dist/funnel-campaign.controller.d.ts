import { FunnelCampaignService } from './funnel-campaign.service';
import { CreateCampaignDto, PreviewMessageDto, SendMessageDto } from './funnel-campaign.dto';
export declare class FunnelCampaignController {
    private readonly funnelCampaignService;
    constructor(funnelCampaignService: FunnelCampaignService);
    createCampaign(body: CreateCampaignDto): import("./funnel-campaign.types").Campaign;
    startCampaign(campaignId: string): import("./funnel-campaign.types").Campaign;
    pauseCampaign(campaignId: string): import("./funnel-campaign.types").Campaign;
    getCampaignStats(campaignId: string): import("./funnel-campaign.types").CampaignStats & {
        campaignId: string;
        status: import("./funnel-campaign.types").Campaign["status"];
        updatedAt: string;
    };
    previewMessage(body: PreviewMessageDto): {
        channel: import("./funnel-campaign.types").MessageChannel;
        preview: string;
    };
    sendMessage(body: SendMessageDto): {
        dispatch: import("./funnel-campaign.types").DispatchRecord;
        result: "accepted";
    };
}
