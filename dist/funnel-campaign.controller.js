"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelCampaignController = void 0;
const common_1 = require("@nestjs/common");
const funnel_campaign_service_1 = require("./funnel-campaign.service");
let FunnelCampaignController = class FunnelCampaignController {
    constructor(funnelCampaignService) {
        this.funnelCampaignService = funnelCampaignService;
    }
    createCampaign(body) {
        return this.funnelCampaignService.createCampaign(body);
    }
    startCampaign(campaignId) {
        return this.funnelCampaignService.startCampaign(campaignId);
    }
    pauseCampaign(campaignId) {
        return this.funnelCampaignService.pauseCampaign(campaignId);
    }
    getCampaignStats(campaignId) {
        return this.funnelCampaignService.getCampaignStats(campaignId);
    }
    previewMessage(body) {
        return this.funnelCampaignService.previewMessage(body);
    }
    sendMessage(body) {
        return this.funnelCampaignService.sendMessage(body);
    }
};
exports.FunnelCampaignController = FunnelCampaignController;
__decorate([
    (0, common_1.Post)('/funnel/campaigns'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FunnelCampaignController.prototype, "createCampaign", null);
__decorate([
    (0, common_1.Post)('/funnel/campaigns/:campaignId/start'),
    __param(0, (0, common_1.Param)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FunnelCampaignController.prototype, "startCampaign", null);
__decorate([
    (0, common_1.Post)('/funnel/campaigns/:campaignId/pause'),
    __param(0, (0, common_1.Param)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FunnelCampaignController.prototype, "pauseCampaign", null);
__decorate([
    (0, common_1.Get)('/funnel/campaigns/:campaignId/stats'),
    __param(0, (0, common_1.Param)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FunnelCampaignController.prototype, "getCampaignStats", null);
__decorate([
    (0, common_1.Post)('/funnel/messages/preview'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FunnelCampaignController.prototype, "previewMessage", null);
__decorate([
    (0, common_1.Post)('/funnel/messages/send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FunnelCampaignController.prototype, "sendMessage", null);
exports.FunnelCampaignController = FunnelCampaignController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [funnel_campaign_service_1.FunnelCampaignService])
], FunnelCampaignController);
//# sourceMappingURL=funnel-campaign.controller.js.map