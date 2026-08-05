import { prisma } from '../config/database';

export interface PopupDto {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  isActive: boolean;
  displayFreq: string;
}

export async function getActivePopup(): Promise<PopupDto | null> {
  return prisma.popupNotification.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getPopup(): Promise<PopupDto | null> {
  return prisma.popupNotification.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
}

export async function upsertPopup(data: Omit<PopupDto, 'id'>): Promise<PopupDto> {
  const existing = await prisma.popupNotification.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (existing) {
    return prisma.popupNotification.update({ where: { id: existing.id }, data });
  }
  return prisma.popupNotification.create({ data });
}
