import { prisma } from '../config/database';
import type { AddressType } from '@prisma/client';

export interface AddressInput {
  type: AddressType;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood?: string;
  postalCode?: string;
  address: string;
  isDefault?: boolean;
}

function notFoundError() {
  return Object.assign(new Error('Adres bulunamadı'), { status: 404 });
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createAddress(userId: string, input: AddressInput) {
  const count = await prisma.address.count({ where: { userId } });
  const isDefault = input.isDefault ?? count === 0;

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId, type: input.type },
      data: { isDefault: false },
    });
  }

  return prisma.address.create({ data: { ...input, userId, isDefault } });
}

export async function updateAddress(userId: string, id: string, input: Partial<AddressInput>) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw notFoundError();

  if (input.isDefault) {
    await prisma.address.updateMany({
      where: { userId, type: existing.type, id: { not: id } },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({ where: { id }, data: input });
}

export async function deleteAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw notFoundError();
  await prisma.address.delete({ where: { id } });
}

export async function setDefaultAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw notFoundError();

  await prisma.address.updateMany({
    where: { userId, type: existing.type },
    data: { isDefault: false },
  });

  return prisma.address.update({ where: { id }, data: { isDefault: true } });
}
