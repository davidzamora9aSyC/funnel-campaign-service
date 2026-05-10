"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelCampaignService = void 0;
const common_1 = require("@nestjs/common");
let FunnelCampaignService = class FunnelCampaignService {
    constructor() {
        this.campaigns = new Map();
        this.dispatches = [];
    }
    createCampaign(dto) {
        const now = new Date().toISOString();
        const campaignId = this.nextId('cmp');
        const campaign = {
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
    startCampaign(campaignId) {
        const campaign = this.requireCampaign(campaignId);
        const now = new Date().toISOString();
        campaign.status = 'running';
        campaign.startedAt = campaign.startedAt ?? now;
        campaign.updatedAt = now;
        this.campaigns.set(campaignId, campaign);
        return campaign;
    }
    pauseCampaign(campaignId) {
        const campaign = this.requireCampaign(campaignId);
        const now = new Date().toISOString();
        campaign.status = 'paused';
        campaign.pausedAt = now;
        campaign.updatedAt = now;
        this.campaigns.set(campaignId, campaign);
        return campaign;
    }
    getCampaignStats(campaignId) {
        const campaign = this.requireCampaign(campaignId);
        return {
            campaignId: campaign.campaignId,
            status: campaign.status,
            updatedAt: campaign.updatedAt,
            ...campaign.stats,
        };
    }
    previewMessage(dto) {
        const preview = this.renderTemplate(dto.template, dto.variables);
        return {
            channel: dto.channel,
            preview,
        };
    }
    sendMessage(dto) {
        if (dto.campaignId) {
            const campaign = this.requireCampaign(dto.campaignId);
            campaign.stats.requested += 1;
            campaign.stats.queued += 1;
            campaign.stats.sent += 1;
            campaign.stats.delivered += 1;
            campaign.updatedAt = new Date().toISOString();
            this.campaigns.set(campaign.campaignId, campaign);
        }
        const dispatch = {
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
    renderTemplate(template, variables) {
        if (!variables) {
            return template;
        }
        return Object.entries(variables).reduce((content, [key, value]) => {
            const token = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            return content.replace(token, String(value));
        }, template);
    }
    requireCampaign(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) {
            throw new common_1.NotFoundException(`Campaign ${campaignId} not found`);
        }
        return campaign;
    }
    emptyStats() {
        return {
            requested: 0,
            queued: 0,
            sent: 0,
            delivered: 0,
            failed: 0,
        };
    }
    nextId(prefix) {
        const random = Math.random().toString(36).slice(2, 10);
        return `${prefix}_${random}`;
    }
};
exports.FunnelCampaignService = FunnelCampaignService;
exports.FunnelCampaignService = FunnelCampaignService = __decorate([
    (0, common_1.Injectable)()
], FunnelCampaignService);
//# sourceMappingURL=funnel-campaign.service.js.map