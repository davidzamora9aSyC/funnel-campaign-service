import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import type { CreateTemplateRequest, RenderTemplateRequest } from './templates.dto';

@Controller('v1')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post('templates')
  createTemplate(@Body() body: CreateTemplateRequest): { template: unknown } {
    return { template: this.templatesService.createTemplate(body) };
  }

  @Get('templates/:templateId')
  getTemplate(@Param('templateId') templateId: string): { template: unknown } {
    return { template: this.templatesService.getTemplate(templateId) };
  }

  @Post('render')
  render(@Body() body: RenderTemplateRequest): {
    rendered_subject?: string;
    rendered_body: string;
  } {
    return this.templatesService.renderTemplate(body);
  }
}

