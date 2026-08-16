"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { shouldKeepThirdPartyTelemetryDisabled } from "@/lib/sensitive-url";

const GOOGLE_ADS_ID = "AW-8236119484";
const GTM_ID = "GTM-TCBNRMBG";

/**
 * Google tags can execute arbitrary container code that reads location.href,
 * even while Consent Mode storage is denied. Never load them on routes whose
 * path contains an encoded analysis snapshot or bearer token.
 */
export function GoogleMeasurement() {
  const pathname = usePathname();
  const [sensitiveRouteSeen, setSensitiveRouteSeen] = useState(false);
  const disabledForDocument = shouldKeepThirdPartyTelemetryDisabled(
    pathname ?? "",
    sensitiveRouteSeen
  );
  useEffect(() => {
    if (disabledForDocument && !sensitiveRouteSeen) {
      setSensitiveRouteSeen(true);
    }
  }, [disabledForDocument, sensitiveRouteSeen]);
  if (
    process.env.NODE_ENV !== "production" ||
    !pathname ||
    disabledForDocument
  ) {
    return null;
  }

  return (
    <>
      <Script id="gtm-loader" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.referrerPolicy='no-referrer';j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <Script
        id="google-ads-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        referrerPolicy="no-referrer"
      />
      <Script id="google-ads-config" strategy="afterInteractive">
        {`gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
          referrerPolicy="no-referrer"
        />
      </noscript>
    </>
  );
}
