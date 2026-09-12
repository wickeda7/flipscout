# Discovery image fix

Replace both apps/web/src/components/discovery/DealDiscovery.tsx and apps/web/next.config.ts, then restart yarn dev:web. No environment or database changes are needed.

Deal photos use next/image with fill, responsive sizes, a fixed-height container, and default lazy loading. Remote image patterns support the current discovery providers and retailer domains over HTTPS. This update retains the previous effect fixes.

Validation: targeted lint has zero errors and zero warnings; production build and image-host matching checks passed. No live retailer searches were made.
