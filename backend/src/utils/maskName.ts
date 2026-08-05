// İsim/soyisim maskeleme — gizlilik için müşteriye dönük (public) listelerde kullanılır.
// "Önder" -> "Ö****", "Ali" -> "A**". İlk harf görünür, kalanı yıldız.

function maskWord(word?: string | null): string {
  const w = (word ?? '').trim();
  if (!w) return '';
  if (w.length === 1) return w;
  return w[0] + '*'.repeat(w.length - 1);
}

// firstName + lastName -> maskelenmiş profil ({ firstName, lastName })
export function maskProfile(profile?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!profile) return profile ?? null;
  return {
    firstName: maskWord(profile.firstName) || null,
    lastName: maskWord(profile.lastName) || null,
  };
}

// "Ad Soyad" gibi tek alan (misafir adı) -> her kelimeyi maskele
export function maskFullName(name?: string | null): string {
  const n = (name ?? '').trim();
  if (!n) return n;
  return n.split(/\s+/).map(maskWord).join(' ');
}
