import { prisma } from '../config/database';
import { AppError } from '../types';
import { maskProfile, maskFullName } from '../utils/maskName';
import * as emailSvc from './emailService';
import { logger } from '../config/logger';

export async function getQuestions(productId: string) {
  const raw = await prisma.productQuestion.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      answers: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  // Gizlilik: müşteriye dönük listede ad/soyad ve misafir adı maskelenir.
  // ADMIN (Satıcı) cevapları frontend'de "Satıcı" gösterildiği için maskelenmez.
  return raw.map((q) => ({
    ...q,
    guestName: maskFullName(q.guestName),
    user: q.user ? { ...q.user, profile: maskProfile(q.user.profile) } : q.user,
    answers: q.answers.map((a) => ({
      ...a,
      user: a.user && a.user.role !== 'ADMIN'
        ? { ...a.user, profile: maskProfile(a.user.profile) }
        : a.user,
    })),
  }));
}

export async function addQuestion(
  productId: string,
  body: string,
  options: { userId?: string; guestName?: string }
) {
  if (!body.trim()) throw new AppError('Soru boş olamaz', 400);
  if (!options.userId && !options.guestName) {
    throw new AppError('Misafir kullanıcılar için isim gereklidir', 400);
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('Ürün bulunamadı', 404);

  const question = await prisma.productQuestion.create({
    data: {
      productId,
      userId: options.userId,
      guestName: options.guestName,
      body: body.trim(),
    },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      answers: true,
    },
  });

  // ─── Yöneticiye yeni soru bildirimi (hata yutulur) ───
  const author =
    [question.user?.profile?.firstName, question.user?.profile?.lastName].filter(Boolean).join(' ').trim() ||
    options.guestName ||
    'Misafir';
  void emailSvc
    .notifyAdminNewQuestion({ productName: product.name, author, body: question.body })
    .catch((e) => logger.error('Yeni soru e-postası gönderilemedi', { questionId: question.id, error: e?.message }));

  return question;
}

export async function addAnswer(
  questionId: string,
  userId: string,
  body: string
) {
  if (!body.trim()) throw new AppError('Cevap boş olamaz', 400);

  const question = await prisma.productQuestion.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new AppError('Soru bulunamadı', 404);

  const answer = await prisma.productAnswer.create({
    data: { questionId, userId, body: body.trim() },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  await prisma.productQuestion.update({
    where: { id: questionId },
    data: { isAnswered: true },
  });

  return answer;
}

// ─── Admin fonksiyonları ──────────────────────────────────────────────────────

export async function listAllQuestions(status: 'pending' | 'approved' | 'all' = 'all') {
  const where =
    status === 'pending' ? { isApproved: false }
    : status === 'approved' ? { isApproved: true }
    : {};

  return prisma.productQuestion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      answers: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
}

export async function setQuestionApproval(questionId: string, approved: boolean) {
  const question = await prisma.productQuestion.findUnique({ where: { id: questionId } });
  if (!question) throw new AppError('Soru bulunamadı', 404);
  return prisma.productQuestion.update({
    where: { id: questionId },
    data: { isApproved: approved },
  });
}

export async function deleteQuestion(questionId: string) {
  const question = await prisma.productQuestion.findUnique({ where: { id: questionId } });
  if (!question) throw new AppError('Soru bulunamadı', 404);
  return prisma.productQuestion.delete({ where: { id: questionId } });
}

export async function adminAnswerQuestion(
  questionId: string,
  userId: string,
  body: string
) {
  if (!body.trim()) throw new AppError('Cevap boş olamaz', 400);

  const question = await prisma.productQuestion.findUnique({ where: { id: questionId } });
  if (!question) throw new AppError('Soru bulunamadı', 404);

  const answer = await prisma.productAnswer.create({
    data: { questionId, userId, body: body.trim() },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  // Soruyu hem cevaplandı hem onaylandı olarak işaretle
  await prisma.productQuestion.update({
    where: { id: questionId },
    data: { isAnswered: true, isApproved: true },
  });

  return answer;
}
