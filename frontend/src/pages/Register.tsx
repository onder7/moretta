// Register.tsx — /kayit rotasını /giris'e yönlendir (Login sayfasında Üye Ol sekmesi var)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Register() {
  const navigate = useNavigate();
  useEffect(() => {
    // Yeni tasarımda giriş + üye ol tek sayfada, sekme ile geçiş yapılıyor
    navigate('/giris', { replace: true, state: { mode: 'signup' } });
  }, [navigate]);
  return null;
}
