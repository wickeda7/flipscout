export const supportedLocales = ["en", "vi"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";

const en = {
  "brand.subtitle": "Resale intelligence",
  "language.english": "English",
  "language.vietnamese": "Tiếng Việt",
  "nav.dashboard": "Dashboard",
  "nav.deals": "Deals",
  "nav.stores": "Stores",
  "nav.calculator": "Calculator",
  "nav.watchlist": "Watchlist",
  "dashboard.context": "Nearby clearance opportunities",
  "dashboard.title": "Today's opportunities",
  "dashboard.subtitle": "Clearance inventory ranked by expected resale value.",
  "dashboard.scan": "Scan nearby stores",
  "dashboard.scanning": "Scanning...",
  "dashboard.potentialProfit": "Potential profit",
  "dashboard.potentialProfitHelper": "across filtered deals",
  "dashboard.strongBuys": "Strong buys",
  "dashboard.strongBuysHelper": "score 90 or higher",
  "dashboard.unitsAvailable": "Units available",
  "dashboard.unitsAvailableHelper": "reported local inventory",
  "dashboard.stores": "Stores",
  "dashboard.storesHelper": "with matching opportunities",
  "dashboard.bestDeals": "Best deals",
  "dashboard.opportunitiesFound": "opportunities found",
  "dashboard.noMatches": "No deals match these filters.",
  "filters.searchPlaceholder": "Search product, brand, or store...",
  "filters.allStores": "All stores",
  "filters.allCategories": "All categories",
  "filters.more": "More filters",
  "sort.buyScore": "Highest buy score",
  "sort.profit": "Highest profit",
  "sort.roi": "Highest ROI",
  "sort.nearest": "Nearest first",
  "status.strong-buy": "STRONG BUY",
  "status.buy": "BUY",
  "status.maybe": "MAYBE",
  "status.skip": "SKIP"
} as const;

const vi: Record<keyof typeof en, string> = {
  "brand.subtitle": "Phân tích bán lại",
  "language.english": "English",
  "language.vietnamese": "Tiếng Việt",
  "nav.dashboard": "Bảng điều khiển",
  "nav.deals": "Cơ hội",
  "nav.stores": "Cửa hàng",
  "nav.calculator": "Máy tính lợi nhuận",
  "nav.watchlist": "Danh sách theo dõi",
  "dashboard.context": "Hàng thanh lý gần bạn",
  "dashboard.title": "Cơ hội hôm nay",
  "dashboard.subtitle": "Hàng thanh lý được xếp hạng theo giá trị bán lại dự kiến.",
  "dashboard.scan": "Quét cửa hàng gần đây",
  "dashboard.scanning": "Đang quét...",
  "dashboard.potentialProfit": "Lợi nhuận tiềm năng",
  "dashboard.potentialProfitHelper": "trên các cơ hội đang lọc",
  "dashboard.strongBuys": "Nên mua mạnh",
  "dashboard.strongBuysHelper": "điểm từ 90 trở lên",
  "dashboard.unitsAvailable": "Số lượng hiện có",
  "dashboard.unitsAvailableHelper": "tồn kho địa phương được báo cáo",
  "dashboard.stores": "Cửa hàng",
  "dashboard.storesHelper": "có cơ hội phù hợp",
  "dashboard.bestDeals": "Cơ hội tốt nhất",
  "dashboard.opportunitiesFound": "cơ hội được tìm thấy",
  "dashboard.noMatches": "Không có cơ hội nào phù hợp với bộ lọc.",
  "filters.searchPlaceholder": "Tìm sản phẩm, thương hiệu hoặc cửa hàng...",
  "filters.allStores": "Tất cả cửa hàng",
  "filters.allCategories": "Tất cả danh mục",
  "filters.more": "Thêm bộ lọc",
  "sort.buyScore": "Điểm mua cao nhất",
  "sort.profit": "Lợi nhuận cao nhất",
  "sort.roi": "ROI cao nhất",
  "sort.nearest": "Gần nhất trước",
  "status.strong-buy": "RẤT NÊN MUA",
  "status.buy": "NÊN MUA",
  "status.maybe": "CÂN NHẮC",
  "status.skip": "BỎ QUA"
};

const dictionaries = { en, vi } as const;
export type TranslationKey = keyof typeof en;

export function translate(locale: SupportedLocale, key: TranslationKey) {
  return dictionaries[locale][key] ?? dictionaries.en[key];
}
