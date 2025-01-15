import api from "./api";
import { EstimateResponse, UploadResponse } from "../types";

export const uploadFile = async (
  file: File,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  _p0: (progress: any) => void
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await api.post<UploadResponse>("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Upload failed", error);
    throw error;
  }
};

//   Get price estimation
export const getEstimate = async (
  file: File,
): Promise<EstimateResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await api.post<EstimateResponse>("/estimate", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Upload failed", error);
    throw error;
  }
};

