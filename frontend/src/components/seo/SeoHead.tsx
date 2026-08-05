import { Helmet } from 'react-helmet-async';
import { useStoreInfo } from '@/hooks/useStoreInfo';

const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ??
  (typeof window !== 'undefined' ? window.location.origin : '');

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product';
  noindex?: boolean;
  schema?: object | object[];
}

export function SeoHead({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noindex = false,
  schema,
}: SeoHeadProps) {
  const { name: SITE_NAME } = useStoreInfo();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = url ?? (typeof window !== 'undefined' ? window.location.href : SITE_URL);
  const ogImage = image ?? `${SITE_URL}/og-default.jpg`;
  const robots = noindex ? 'noindex, nofollow' : 'index, follow';

  const schemaArr = schema ? (Array.isArray(schema) ? schema : [schema]) : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type === 'product' ? 'product' : 'website'} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="tr_TR" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {schemaArr && (
        <script type="application/ld+json">
          {JSON.stringify(schemaArr.length === 1 ? schemaArr[0] : schemaArr)}
        </script>
      )}
    </Helmet>
  );
}

export { SITE_URL };
