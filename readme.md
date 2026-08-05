

## Proje Güncelleme Talimatı: Yeni Ön Yüz Entegrasyonu

### Proje Özeti
* **Repo:** [onder7/Nefesol_Shop](https://github.com/onder7/Nefesol_Shop)

* **Teknoloji Stack:** React
* **Hedef:** Mevcut React tabanlı online alışveriş projesinin ön yüzünü (Müşteri Arayüzü / Client Interface) tamamen yeni tasarımla değiştirmek.

proje github sayfası https://github.com/onder7/moretta -> şu anda tamamen boş
---

### Ana Gereksinimler & Kurallar

1. **Admin Paneli Korunacak:**
   * Projedeki mevcut **Admin Paneli** ve ilgili rotalar (`/admin` vb.), işlevsellikleri ve mimarisi hiçbir şekilde değiştirilmeyecektir. Aynen korunacaktır.

2. **Yeni Ön Yüz Kaynağı:**
   * Yeni tasarlanan ön yüz kodları/bileşenleri proje kök dizinindeki `./tasarim` klasöründe yer almaktadır.

3. **Veri & Fonksiyon Entegrasyonu:**
   * Mevcut projedeki iş mantığı (business logic), state yönetimi, API istekleri ve eski arayüzde çalışan mevcut özellikler yeni tasarıma aktarılmalıdır.
   * Yeni arayüzde bulunan ancak eski projede karşılığı olan bileşenler/akışlar, mevcut yapıyı bozmadan ve verileri doğru şekilde bağlayarak giydirilmelidir.

---

### Görev Adımları
1. `./tasarim` klasöründeki yeni bileşenleri incele ve mevcut projeye entegre et. (yeni bileşenler var / olabilir bunlara dokunma tasarımda kalsın gereken geliştirmeyi yapacağız)
2. Müşteri tarafı rotalarını (Home, Product Detail, Cart, Checkout vb.) yeni tasarım bileşenleri ile güncelle.
3. Eski projedeki durum yönetimi (State/Context/Redux) ve API entegrasyonlarını yeni tasarıma bağla.
4. Admin paneline dokunulmadığını ve mevcut tüm istemci fonksiyonlarının yeni arayüzde eksiksiz çalıştığını doğrula.
