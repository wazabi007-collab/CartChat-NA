import { getArchetype, type IndustryArchetype } from "./industry";

const SERVICE_ARCHETYPES: IndustryArchetype[] = ["beauty", "services"];

export interface ServiceLabels {
  item: string;
  itemPlural: string;
  addItem: string;
  firstItem: string;
  isService: boolean;
}

export function getServiceLabels(industry: string | null | undefined): ServiceLabels {
  const archetype = getArchetype(industry || "other");
  const isService = SERVICE_ARCHETYPES.includes(archetype);

  return {
    item: isService ? "Service" : "Product",
    itemPlural: isService ? "Services" : "Products",
    addItem: isService ? "Add Service" : "Add Product",
    firstItem: isService ? "Add your first service" : "Add your first product",
    isService,
  };
}
