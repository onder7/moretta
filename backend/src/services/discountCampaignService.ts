import { prisma } from '../config/database';

export interface CampaignDto {
  id: string;
  name: string;
  discountText: string;
  endDate: Date;
  showOnHome: boolean;
  color: string;
  displayType: string;
  ctaText: string | null;
  ctaLink: string | null;
}

export async function getActiveCampaign(): Promise<CampaignDto | null> {
  return prisma.discountCampaign.findFirst({
    where: { showOnHome: true, endDate: { gt: new Date() } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getCampaign(): Promise<CampaignDto | null> {
  return prisma.discountCampaign.findFirst({ orderBy: { updatedAt: 'desc' } });
}

export async function upsertCampaign(data: Omit<CampaignDto, 'id'>): Promise<CampaignDto> {
  const existing = await prisma.discountCampaign.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (existing) {
    return prisma.discountCampaign.update({ where: { id: existing.id }, data });
  }
  return prisma.discountCampaign.create({ data });
}
