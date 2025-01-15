export interface UserData {
  name: string;
  contact: string;
  organization: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  avatar: string;
  organization: string;
  contact: string;
}

export interface Order {
  orderDate: string;
  uid: string;
  fileName: string;
  status: string;
  printTime: string;
  price: string;
  quantity: number;
  url: string;
}

export interface FileState {
  file: File;
  status: "idle" | "uploading" | "uploaded" | "error" | "estimated";
  uploadProgress?: number;
  url?: string;
  weight?: number;
  time?: string;
  isEstimating?: boolean;
  material?: Material;
  quality?: "normal" | "high";
  color?: string;
  infill?: number;
  initialPrice?: number;
}

export interface Material {
  name: string;
  description: string;
  properties: {
    Tensile: string;
    elongation: string;
    Flexural: string;
    HDT: string;
  };
  colors: string[];
}

export interface EstimatedValue {
  price: number;
  time: string;
  weight: number;
}

export interface EstimatorProps {
  fileState: FileState;
  unit: string;
  loadTime: string;
  estimatedValues: { price: number; time: string; weight: number } | null;
  onEstimateStart?: () => void;
  onEstimateComplete?: (price: number, time: string, weight: number) => void;
  onLoadTime?: (loadTime: string) => void;
}

export interface EstimateResponse {
  weight: number;
  time: number;
  price: number;
}

export interface UploadResponse {
  url: string;
  volume: number;
}

export interface QuoteRequest {
  customer: string;
  email: string;
  products: Product[];
}

export interface Product {
  name: string;
  rate: number;
  quantity: number;
  url?: string;
}

export interface QuoteResponse {
  message: JSON;
}

export interface SheetsData {
  customer: string;
  email: string;
  products: Product[];
}
