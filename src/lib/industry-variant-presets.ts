import { getArchetype, type IndustryArchetype } from "./industry";

export type VariantPreset = {
  id: string;
  label: string;
  description: string;
  optionTextExamples: string[];
  recommendedAttributes: string[];
};

const FIT_ORDER = ["mens", "men", "male", "ladies", "lady", "women", "womens", "female", "unisex", "kids"];
const SIZE_ORDER = ["xxs", "xs", "s", "small", "m", "medium", "l", "large", "xl", "1xl", "2xl", "xxl", "3xl", "xxxl", "4xl", "5xl"];
const PORTION_ORDER = ["mini", "small", "regular", "medium", "large", "family", "single", "double"];
const SPICE_ORDER = ["none", "mild", "medium", "hot", "extra hot"];
const DURATION_ORDER = ["15 min", "30 min", "45 min", "60 min", "90 min", "120 min"];

const ATTRIBUTE_ORDER: Record<IndustryArchetype, string[]> = {
  food_prepared: [
    "portion",
    "size",
    "base",
    "protein",
    "spice level",
    "sauce",
    "temperature",
    "dietary",
    "add-ons",
    "extras",
  ],
  food_fresh: ["weight", "pack size", "cut", "grade", "unit", "fresh/frozen", "brand", "flavour", "flavor"],
  retail: ["fit", "gender", "colour", "color", "size", "material", "model", "storage", "connectivity", "condition"],
  beauty: ["service type", "duration", "hair length", "treatment", "shade", "colour", "color", "scent", "stylist"],
  services: ["package", "duration", "location", "urgency", "add-ons", "extras"],
  gifting: ["size", "occasion", "colour theme", "color theme", "colour", "color", "wrapping", "add-ons", "extras"],
};

const ARCHETYPE_PRESETS: Record<IndustryArchetype, VariantPreset[]> = {
  food_prepared: [
    {
      id: "takeaway-meal",
      label: "Takeaway meal",
      description: "For meals where portion, protein/base, and spice level change the order.",
      recommendedAttributes: ["Portion", "Protein", "Spice Level", "Sauce", "Add-ons"],
      optionTextExamples: [
        "Portion: Regular, Protein: Chicken, Spice Level: Medium",
        "Portion: Large, Protein: Chicken, Spice Level: Medium",
        "Portion: Regular, Protein: Beef, Spice Level: Mild",
      ],
    },
    {
      id: "drink-cafe",
      label: "Cafe drink",
      description: "For coffee, tea, smoothies, and drinks with size and temperature choices.",
      recommendedAttributes: ["Size", "Temperature", "Milk", "Sweetness"],
      optionTextExamples: [
        "Size: Regular, Temperature: Hot, Milk: Full Cream",
        "Size: Large, Temperature: Hot, Milk: Full Cream",
        "Size: Regular, Temperature: Iced, Milk: Oat",
      ],
    },
    {
      id: "bakery-catering",
      label: "Bakery or catering",
      description: "For baked goods, platters, and prepared portions.",
      recommendedAttributes: ["Size", "Flavour", "Dietary", "Occasion"],
      optionTextExamples: [
        "Size: Small, Flavour: Vanilla, Dietary: Standard",
        "Size: Medium, Flavour: Chocolate, Dietary: Standard",
        "Size: Large, Flavour: Vanilla, Dietary: Eggless",
      ],
    },
  ],
  food_fresh: [
    {
      id: "fresh-pack",
      label: "Fresh goods",
      description: "For grocery, produce, butchery, and packaged fresh items.",
      recommendedAttributes: ["Weight", "Cut", "Grade", "Fresh/Frozen"],
      optionTextExamples: [
        "Weight: 500g, Cut: Standard, Fresh/Frozen: Fresh",
        "Weight: 1kg, Cut: Standard, Fresh/Frozen: Fresh",
        "Weight: 1kg, Cut: Premium, Fresh/Frozen: Frozen",
      ],
    },
    {
      id: "liquor-pack",
      label: "Liquor or drinks pack",
      description: "For beverages sold by pack size, flavour, or volume.",
      recommendedAttributes: ["Volume", "Pack Size", "Flavour", "Brand"],
      optionTextExamples: [
        "Volume: 330ml, Pack Size: Single, Flavour: Original",
        "Volume: 330ml, Pack Size: 6 Pack, Flavour: Original",
        "Volume: 500ml, Pack Size: Single, Flavour: Lemon",
      ],
    },
  ],
  retail: [
    {
      id: "fashion",
      label: "Fashion",
      description: "For clothing and apparel with fit, colour, and size combinations.",
      recommendedAttributes: ["Fit", "Colour", "Size", "Material"],
      optionTextExamples: [
        "Fit: Mens, Colour: Black, Size: Medium",
        "Fit: Ladies, Colour: Black, Size: Medium",
        "Fit: Unisex, Colour: Navy, Size: Large",
      ],
    },
    {
      id: "electronics",
      label: "Electronics",
      description: "For devices and accessories with model, storage, or connectivity choices.",
      recommendedAttributes: ["Model", "Storage", "Colour", "Connectivity", "Condition"],
      optionTextExamples: [
        "Model: Standard, Storage: 64GB, Colour: Black",
        "Model: Standard, Storage: 128GB, Colour: Black",
        "Model: Pro, Storage: 128GB, Colour: Silver",
      ],
    },
    {
      id: "hardware-parts",
      label: "Hardware or parts",
      description: "For tools, parts, and supplies sold by specification or compatibility.",
      recommendedAttributes: ["Size", "Type", "Brand", "Compatibility"],
      optionTextExamples: [
        "Size: Small, Type: Standard, Brand: Generic",
        "Size: Medium, Type: Heavy Duty, Brand: Generic",
        "Size: Large, Type: Heavy Duty, Brand: Premium",
      ],
    },
  ],
  beauty: [
    {
      id: "beauty-product",
      label: "Beauty product",
      description: "For cosmetics and care products with shade, scent, or size choices.",
      recommendedAttributes: ["Shade", "Scent", "Size", "Skin Type"],
      optionTextExamples: [
        "Shade: Light, Size: 50ml, Skin Type: Normal",
        "Shade: Medium, Size: 50ml, Skin Type: Normal",
        "Shade: Dark, Size: 100ml, Skin Type: Dry",
      ],
    },
    {
      id: "salon-service",
      label: "Salon service",
      description: "For services where duration, hair length, or treatment changes the price.",
      recommendedAttributes: ["Service Type", "Duration", "Hair Length", "Treatment"],
      optionTextExamples: [
        "Service Type: Wash, Duration: 30 min, Hair Length: Short",
        "Service Type: Wash & Blow, Duration: 60 min, Hair Length: Medium",
        "Service Type: Treatment, Duration: 90 min, Hair Length: Long",
      ],
    },
  ],
  services: [
    {
      id: "service-package",
      label: "Service package",
      description: "For service tiers, appointment lengths, and on-site options.",
      recommendedAttributes: ["Package", "Duration", "Location", "Urgency"],
      optionTextExamples: [
        "Package: Basic, Duration: 30 min, Location: In-store",
        "Package: Standard, Duration: 60 min, Location: On-site",
        "Package: Premium, Duration: 90 min, Location: On-site",
      ],
    },
  ],
  gifting: [
    {
      id: "gift-occasion",
      label: "Gift or flowers",
      description: "For gifts sold by size, occasion, wrapping, or colour theme.",
      recommendedAttributes: ["Size", "Occasion", "Colour Theme", "Wrapping", "Add-ons"],
      optionTextExamples: [
        "Size: Small, Occasion: Birthday, Colour Theme: Bright",
        "Size: Medium, Occasion: Anniversary, Colour Theme: Soft",
        "Size: Large, Occasion: Sympathy, Colour Theme: White",
      ],
    },
  ],
};

const INDUSTRY_PRESET_IDS: Record<string, string[]> = {
  restaurant: ["takeaway-meal", "drink-cafe"],
  takeaway: ["takeaway-meal", "drink-cafe"],
  cafe: ["drink-cafe", "takeaway-meal"],
  bakery: ["bakery-catering", "drink-cafe"],
  catering: ["bakery-catering", "takeaway-meal"],
  grocery: ["fresh-pack"],
  butchery: ["fresh-pack"],
  liquor: ["liquor-pack"],
  agriculture: ["fresh-pack"],
  fashion: ["fashion"],
  electronics: ["electronics"],
  hardware: ["hardware-parts"],
  auto_parts: ["hardware-parts"],
  salon: ["salon-service", "beauty-product"],
  cosmetics: ["beauty-product"],
  pharmacy: ["beauty-product"],
  cleaning: ["service-package"],
  printing: ["service-package"],
  services: ["service-package"],
  gas_water: ["service-package"],
  flowers: ["gift-occasion"],
  pet: ["gift-occasion"],
};

function normalizeAttributeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeOptionName(name: string) {
  return name.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function optionSuggestsFit(options: string[]) {
  return options.some((option) => /^(men|mens|male|ladies|lady|women|womens|female|unisex|kids)$/i.test(option.trim()));
}

function findPresetById(id: string) {
  return Object.values(ARCHETYPE_PRESETS).flat().find((preset) => preset.id === id);
}

export function getVariantPresets(industry: string | null | undefined): VariantPreset[] {
  const archetype = getArchetype(industry);
  const industryIds = industry ? INDUSTRY_PRESET_IDS[industry] : undefined;
  if (!industryIds) return ARCHETYPE_PRESETS[archetype];

  const matched = industryIds.map(findPresetById).filter(Boolean) as VariantPreset[];
  const fallback = ARCHETYPE_PRESETS[archetype].filter((preset) => !industryIds.includes(preset.id));
  return [...matched, ...fallback];
}

export function getDefaultVariantOptionText(industry: string | null | undefined): string {
  return getVariantPresets(industry)[0]?.optionTextExamples[0] ?? "Option: Standard";
}

export function displayVariantAttributeName(name: string, options: string[] = []) {
  const normalized = normalizeAttributeName(name);
  if (normalized.includes("gender") || normalized.includes("fit") || normalized.includes("sex") || optionSuggestsFit(options)) {
    return "Fit";
  }
  if (normalized.includes("colour") || normalized.includes("color")) return "Colour";
  if (normalized.includes("packsize")) return "Pack Size";
  if (normalized.includes("spicelevel")) return "Spice Level";
  if (normalized.includes("frozen") && normalized.includes("fresh")) return "Fresh/Frozen";
  if (normalized.includes("colourtheme") || normalized.includes("colortheme")) return "Colour Theme";
  return name;
}

export function getVariantAttributePriority(
  industry: string | null | undefined,
  name: string,
  options: string[] = []
) {
  const archetype = getArchetype(industry);
  const displayName = displayVariantAttributeName(name, options);
  const normalizedDisplay = normalizeOptionName(displayName);
  const normalizedRaw = normalizeOptionName(name);
  const order = ATTRIBUTE_ORDER[archetype];
  const index = order.findIndex((entry) => entry === normalizedDisplay || entry === normalizedRaw);
  return index >= 0 ? index : 100;
}

export function sortVariantOptionValues(name: string, options: string[]) {
  const displayName = displayVariantAttributeName(name, options);
  const normalized = normalizeOptionName(displayName);
  const order =
    normalized === "fit"
      ? FIT_ORDER
      : normalized === "size"
        ? SIZE_ORDER
        : normalized === "portion"
          ? PORTION_ORDER
          : normalized === "spice level"
            ? SPICE_ORDER
            : normalized === "duration"
              ? DURATION_ORDER
              : [];

  return [...options].sort((a, b) => {
    const aKey = a.trim().toLowerCase();
    const bKey = b.trim().toLowerCase();
    const aIndex = order.indexOf(aKey);
    const bIndex = order.indexOf(bKey);
    if (aIndex >= 0 || bIndex >= 0) {
      return (aIndex >= 0 ? aIndex : 999) - (bIndex >= 0 ? bIndex : 999);
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}
