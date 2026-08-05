# 🚀 Canlı Sunucuya Deploy (GitHub Actions)

Üretim sunucusu **Nginx Proxy Manager (NPM)** + **Portainer** ile çalışır:
`shop.nefesol.net` → NPM (SSL) → `onder_online_shop-nginx-1:80` (`web_proxy` ağı üzerinden).

Proje sunucuda şu dizinde, **git checkout** olarak durur:
`/home/onder/management/stacks/nefesol-shop` (origin: bu repo).
Buradaki `docker-compose.yml` **özelleştirilmiştir** (nginx portu yayınlamaz, `web_proxy`
harici ağına bağlıdır) ve `.env` (DB şifresi dahil) sunucuya aittir.

## Deploy nasıl çalışır

`.github/workflows/deploy.yml`, `master`'a her push'ta:
1. Sunucuya SSH ile bağlanır,
2. `git checkout origin/master -- frontend backend admin docker` ile **yalnızca uygulama
   kaynağını** günceller — `docker-compose.yml`, `.env` ve `nginx/` config'ine **dokunmaz**,
3. `docker compose up -d --build` ile yeniden build edip başlatır.

Böylece NPM, SSL, `web_proxy` ağı ve veritabanı **hiç etkilenmez**; sadece yeni kod devreye girer.

## Gerekli GitHub Secrets

`Settings → Secrets and variables → Actions`

| Secret | Değer |
|--------|-------|
| `SERVER_HOST` | `31.7.33.14` |
| `SERVER_USER` | `onder` |
| `SERVER_PASSWORD` | SSH şifresi *(SSH key önerilir)* |

> Not: `POSTGRES_*`, `JWT_*`, `FRONTEND_URL` secret'ları bu akışta **kullanılmaz** —
> bu değerler sunucudaki `.env`'de zaten mevcut ve korunuyor. Eklemiş olmanız zarar vermez.

## Tek seferlik kontrol (sunucuda)

Sunucudaki `.env`'de site adresinin doğru olduğundan emin olun:

```bash
cd /home/onder/management/stacks/nefesol-shop
grep -E 'FRONTEND_URL|ADMIN_URL' .env
# Beklenen:
#   FRONTEND_URL=https://shop.nefesol.net
#   ADMIN_URL=https://shop.nefesol.net
# Değilse düzenleyip: docker compose up -d backend
```

## Kullanım

- Kod push'ladığınızda otomatik deploy olur, **veya**
- GitHub → **Actions → Deploy to Production → Run workflow** ile elle tetikleyin.

## ⚠️ Notlar

- **compose / .env değişiklikleri otomatik gelmez.** Workflow yalnızca uygulama kaynağını
  günceller. `docker-compose.yml`, `.env` veya `nginx/` config'inde değişiklik gerekiyorsa
  sunucuda elle güncelleyin (bu dosyalar NPM/altyapıya özeldir).
- **SSH key (önerilir):** Sunucuda `~/.ssh/authorized_keys`'e public key ekleyin, private
  key'i `SERVER_SSH_KEY` secret'ı yapın, `deploy.yml`'de `password:` yerine
  `key: ${{ secrets.SERVER_SSH_KEY }}` kullanın.
- **Güvenlik:** SSH ve DB şifreleri geçmişte ifşa olduysa değiştirin (DB şifresi değişimi
  volume sıfırlama gerektirir — dikkatli olun).
