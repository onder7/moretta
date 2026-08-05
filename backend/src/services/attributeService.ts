import { prisma } from '../config/database';
import { AppError } from '../types';

function toSlug(name: string) {
  return name
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listAttributes() {
  return prisma.attribute.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      values: { orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] },
    },
  });
}

export async function listAllAttributes() {
  return prisma.attribute.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      values: { orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] },
    },
  });
}

export async function createAttribute(data: { name: string; inputType?: string; sortOrder?: number }) {
  const slug = toSlug(data.name);
  const existing = await prisma.attribute.findFirst({ where: { OR: [{ name: data.name }, { slug }] } });
  if (existing) throw new AppError('Bu özellik adı zaten kullanılıyor', 409);

  return prisma.attribute.create({
    data: { name: data.name, slug, inputType: data.inputType ?? 'select', sortOrder: data.sortOrder ?? 0 },
    include: { values: true },
  });
}

export async function updateAttribute(id: string, data: { name?: string; inputType?: string; sortOrder?: number; isActive?: boolean }) {
  const attr = await prisma.attribute.findUnique({ where: { id } });
  if (!attr) throw new AppError('Özellik bulunamadı', 404);

  const updateData: Record<string, unknown> = { ...data };
  if (data.name) {
    const slug = toSlug(data.name);
    const conflict = await prisma.attribute.findFirst({ where: { OR: [{ name: data.name }, { slug }], NOT: { id } } });
    if (conflict) throw new AppError('Bu özellik adı zaten kullanılıyor', 409);
    updateData.slug = slug;
  }

  return prisma.attribute.update({ where: { id }, data: updateData, include: { values: true } });
}

export async function deleteAttribute(id: string) {
  const attr = await prisma.attribute.findUnique({ where: { id } });
  if (!attr) throw new AppError('Özellik bulunamadı', 404);
  await prisma.$transaction([
    prisma.variantAttributeValue.deleteMany({ where: { attributeValue: { attributeId: id } } }),
    prisma.attribute.delete({ where: { id } }),
  ]);
}

export async function addAttributeValue(attributeId: string, data: { value: string; colorHex?: string; sortOrder?: number }) {
  const attr = await prisma.attribute.findUnique({ where: { id: attributeId } });
  if (!attr) throw new AppError('Özellik bulunamadı', 404);

  const existing = await prisma.attributeValue.findFirst({ where: { attributeId, value: data.value } });
  if (existing) throw new AppError('Bu değer bu özellik için zaten mevcut', 409);

  return prisma.attributeValue.create({
    data: { attributeId, value: data.value, colorHex: data.colorHex, sortOrder: data.sortOrder ?? 0 },
  });
}

export async function updateAttributeValue(valueId: string, data: { value?: string; colorHex?: string; sortOrder?: number }) {
  const val = await prisma.attributeValue.findUnique({ where: { id: valueId } });
  if (!val) throw new AppError('Değer bulunamadı', 404);

  if (data.value && data.value !== val.value) {
    const conflict = await prisma.attributeValue.findFirst({ where: { attributeId: val.attributeId, value: data.value } });
    if (conflict) throw new AppError('Bu değer bu özellik için zaten mevcut', 409);
  }

  return prisma.attributeValue.update({ where: { id: valueId }, data });
}

export async function deleteAttributeValue(valueId: string) {
  const val = await prisma.attributeValue.findUnique({ where: { id: valueId } });
  if (!val) throw new AppError('Değer bulunamadı', 404);
  await prisma.$transaction([
    prisma.variantAttributeValue.deleteMany({ where: { attributeValueId: valueId } }),
    prisma.attributeValue.delete({ where: { id: valueId } }),
  ]);
}

// ─── Kartezyen çarpım: kombinasyon üretimi ────────────────────────────────────

export function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  );
}
