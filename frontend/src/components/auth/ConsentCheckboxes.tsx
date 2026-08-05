import { Link } from 'react-router-dom';

export interface ConsentValue {
  emailConsent: boolean;
  smsConsent: boolean;
  acceptTerms: boolean;
}

interface Props {
  value: ConsentValue;
  onChange: (patch: Partial<ConsentValue>) => void;
}

const boxCls = 'mt-0.5 h-5 w-5 shrink-0 accent-primary cursor-pointer';
const textCls = 'text-xs leading-relaxed text-muted-foreground';

/**
 * Üyelik kayıt ve misafir (üye olmadan devam) ekranlarında gösterilen
 * ETK/KVKK onay kutuları. acceptTerms zorunludur.
 */
export function ConsentCheckboxes({ value, onChange }: Props) {
  return (
    <div className="space-y-2.5 pt-2">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.emailConsent}
          onChange={(e) => onChange({ emailConsent: e.target.checked })}
          className={boxCls}
        />
        <span className={textCls}>
          Kampanya, duyuru, bilgilendirmelerden <span className="font-semibold text-foreground">e-posta</span> ile
          haberdar olmak istiyorum.
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.smsConsent}
          onChange={(e) => onChange({ smsConsent: e.target.checked })}
          className={boxCls}
        />
        <span className={textCls}>
          Kampanya, duyuru, bilgilendirmelerden <span className="font-semibold text-foreground">SMS</span> ile
          haberdar olmak istiyorum.
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.acceptTerms}
          onChange={(e) => onChange({ acceptTerms: e.target.checked })}
          className={boxCls}
        />
        <span className={textCls}>
          <Link to="/uyelik" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Üyelik koşulları
          </Link>
          nı ve{' '}
          <Link to="/kvkk" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            kişisel verilerimin korunması
          </Link>
          nı kabul ediyorum. <span className="text-red-500">*</span>
        </span>
      </label>
    </div>
  );
}
