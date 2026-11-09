import type { components } from "./api-types.generated";

type Schemas = components["schemas"];

export type ModelSpec = Schemas["ModelSpec"];
export type CatalogResponse = Schemas["CatalogResponse"];
export type EstimateResponse = Schemas["EstimateResponse"];
export type CompareResponse = Schemas["CompareResponse"];
export type RunResponse = Schemas["RunResponse"];
export type ProviderName = ModelSpec["provider"];
