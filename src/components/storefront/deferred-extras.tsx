"use client";

import dynamic from "next/dynamic";

/**
 * Storefront chrome that nobody needs in order to read the shop.
 *
 * The install banner and the report link are always rendered, so a plain
 * dynamic import would still load their chunks with everything else — only
 * `ssr: false` actually keeps them off the critical path, and that is not
 * allowed from a Server Component. Hence this thin client boundary.
 *
 * Neither causes layout shift by arriving late: the install banner renders
 * nothing until the browser fires `beforeinstallprompt`, and the report link
 * sits in the footer below the fold.
 */
const InstallBar = dynamic(
  () => import("@/components/pwa/install-bar").then((m) => m.InstallBar),
  { ssr: false }
);

const ReportButton = dynamic(
  () => import("@/components/storefront/report-button").then((m) => m.ReportButton),
  { ssr: false }
);

export function DeferredInstallBar() {
  return <InstallBar />;
}

export function DeferredReportButton(props: { merchantId: string; storeName: string }) {
  return <ReportButton {...props} />;
}
