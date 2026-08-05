import fs from 'fs';
import path from 'path';

/**
 * Türkiye İl / İlçe / Mahalle verisi.
 * Kaynak: metinyildirimnet/turkiye-adresler-json (Türkçe karakterler düzeltilmiş,
 * Title-Case'e çevrilmiş, iç içe { il: { ilçe: [mahalle...] } } yapısına dönüştürülmüş).
 * Dosya prod imajında dist/data altına kopyalanır (bkz. docker/backend.Dockerfile).
 */
type AddressTree = Record<string, Record<string, string[]>>;

const dataPath = path.join(__dirname, '..', 'data', 'turkiye-adres.json');

let cache: AddressTree | null = null;

function load(): AddressTree {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as AddressTree;
  }
  return cache;
}

/** Tüm iller (alfabetik, tr sıralı — veri zaten sıralı kaydedildi). */
export function getIller(): string[] {
  return Object.keys(load());
}

/** Verilen ilin ilçeleri. Bilinmeyen il → boş dizi. */
export function getIlceler(il: string): string[] {
  const tree = load();
  const node = tree[il];
  return node ? Object.keys(node) : [];
}

/** Verilen il/ilçenin mahalle/köyleri. Bilinmeyen → boş dizi. */
export function getMahalleler(il: string, ilce: string): string[] {
  const tree = load();
  return tree[il]?.[ilce] ?? [];
}
