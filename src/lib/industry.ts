export type IndustryArchetype =
  | "food_prepared"
  | "food_fresh"
  | "retail"
  | "beauty"
  | "services"
  | "gifting";

export type NotifiableStatus = "confirmed" | "completed" | "cancelled";

export type LayoutVariant =
  | "menu-list"
  | "compact-grid"
  | "product-grid"
  | "horizontal-card"
  | "service-list"
  | "visual-gallery";

export interface ThemeConfig {
  accent: string;
  accentHover: string;
  bgTint: string;
  borderColor: string;
  ctaText: string;
  sectionLabel: string;
  layout: LayoutVariant;
}

export interface OrderMessageData {
  customerName: string;
  orderNumber: number;
  storeName: string;
  total?: string;
}

const ARCHETYPE_MAP: Record<string, IndustryArchetype> = {
  // food_prepared
  restaurant: "food_prepared",
  takeaway: "food_prepared",
  cafe: "food_prepared",
  bakery: "food_prepared",
  catering: "food_prepared",
  // food_fresh
  grocery: "food_fresh",
  butchery: "food_fresh",
  liquor: "food_fresh",
  agriculture: "food_fresh",
  // retail
  fashion: "retail",
  electronics: "retail",
  hardware: "retail",
  auto_parts: "retail",
  furniture: "retail",
  stationery: "retail",
  sports: "retail",
  toys: "retail",
  general_dealer: "retail",
  crafts: "retail",
  other: "retail",
  // beauty
  salon: "beauty",
  cosmetics: "beauty",
  pharmacy: "beauty",
  // services
  cleaning: "services",
  printing: "services",
  services: "services",
  gas_water: "services",
  // gifting
  flowers: "gifting",
  pet: "gifting",
};

const THEME_CONFIGS: Record<IndustryArchetype, ThemeConfig> = {
  food_prepared: {
    accent: "#ea580c",
    accentHover: "#c2410c",
    bgTint: "#fff7ed",
    borderColor: "#fed7aa",
    ctaText: "Order Now",
    sectionLabel: "Menu",
    layout: "menu-list",
  },
  food_fresh: {
    accent: "#15803d",
    accentHover: "#166534",
    bgTint: "#f0fdf4",
    borderColor: "#bbf7d0",
    ctaText: "Add to Basket",
    sectionLabel: "Fresh Picks",
    layout: "compact-grid",
  },
  retail: {
    accent: "#16a34a",
    accentHover: "#15803d",
    bgTint: "#f0fdf4",
    borderColor: "#bbf7d0",
    ctaText: "Add to Cart",
    sectionLabel: "Products",
    layout: "product-grid",
  },
  beauty: {
    accent: "#db2777",
    accentHover: "#be185d",
    bgTint: "#fdf2f8",
    borderColor: "#fbcfe8",
    ctaText: "Book Now",
    sectionLabel: "Treatments",
    layout: "horizontal-card",
  },
  services: {
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    bgTint: "#eff6ff",
    borderColor: "#bfdbfe",
    ctaText: "Request",
    sectionLabel: "Our Services",
    layout: "service-list",
  },
  gifting: {
    accent: "#b45309",
    accentHover: "#92400e",
    bgTint: "#fffbeb",
    borderColor: "#fde68a",
    ctaText: "Send Gift",
    sectionLabel: "Gift Collection",
    layout: "visual-gallery",
  },
};

const TEMPLATES: Record<
  IndustryArchetype,
  Record<NotifiableStatus, { withTotal: string; withoutTotal: string }>
> = {
  food_prepared: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared. We'll let you know when it's ready!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared. We'll let you know when it's ready!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! Total: {total}. Thank you for your order!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! Thank you for your order!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  food_fresh: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being packed. We'll notify you when it's ready for collection!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being packed. We'll notify you when it's ready for collection!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is packed and ready! Total: {total}. Thank you!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is packed and ready! Thank you!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  retail: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} has been confirmed. We're getting it ready for you!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} has been confirmed. We're getting it ready for you!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready for pickup. Total: {total}. Thank you for shopping with us!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready for pickup. Thank you for shopping with us!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  beauty: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed. We look forward to serving you!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed. We look forward to serving you!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready. Total: {total}. Thank you for choosing us!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready. Thank you for choosing us!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  services: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and scheduled. We'll be in touch with details!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and scheduled. We'll be in touch with details!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is complete. Total: {total}. Thank you for your business!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is complete. Thank you for your business!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  gifting: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared with care!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared with care!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! Total: {total}. We hope it brings joy!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! We hope it brings joy!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
};

export function getArchetype(industry: string | null | undefined): IndustryArchetype {
  if (!industry) return "retail";
  return ARCHETYPE_MAP[industry] ?? "retail";
}

export function getThemeConfig(industry: string | null | undefined): ThemeConfig | null {
  if (!industry) return null;
  const archetype = ARCHETYPE_MAP[industry];
  if (!archetype) return null;
  return THEME_CONFIGS[archetype];
}

export function getOrderMessage(
  industry: string | null | undefined,
  status: NotifiableStatus,
  data: OrderMessageData
): string {
  const archetype = getArchetype(industry);
  const variant = data.total ? "withTotal" : "withoutTotal";
  const template = TEMPLATES[archetype][status][variant];

  return template.replace(/\{(customerName|orderNumber|storeName|total)\}/g, (_, key) => {
    const values: Record<string, string> = {
      customerName: data.customerName,
      orderNumber: data.orderNumber.toString(),
      storeName: data.storeName,
      total: data.total ?? "",
    };
    return values[key] ?? "";
  });
}
