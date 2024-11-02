// Dashboard.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { MaterialCard } from "./components/materialCard";
import { FileUploadArea } from "./components/fileUploadArea";
import { SettingsPanel } from "./components/settingPanel";
import { useFileUpload } from "./hooks/useFileUpload";
import STLViewer from "./components/STLViewer";
import Estimator from "./components/estimator";
import PriceSummary from "./components/priceSummary";
import { Material, FileState } from "../types";

// Import material images
import PLA from "../assets/pla.png";
import ABS from "../assets/ABS.webp";
import PETG from "../assets/PETG.webp";
import TPU from "../assets/TPU.png";
import { UseUser } from "@/userContext";

const defaultMaterial: Material = {
  name: "PLA",
  description:
    "PLA (polylactic acid), is a thermoplastic polymer derived from renewable resources. This feature sets it apart from other commonly used plastics. PLA is great for low cost prototyping, containers, and functional parts under a light load.",
  properties: {
    Tensile: "26.8 - 70 MPa",
    elongation: "1.9 - 20%",
    Flexural: "46 - 88 MPa",
    HDT: "50 - 55°C",
  },
  colors: ["White", "Black", "Grey"],
};

const defaultSettings: Partial<FileState> = {
  material: defaultMaterial,
  infill: 20,
  quality: "normal",
  color: "Black",
};

const materialImages: { [key: string]: string } = {
  PLA,
  ABS,
  PETG,
  TPU,
};

export default function Dashboard() {
  const {
    fileStates,
    setFileStates,
    currentFileIndex,
    setCurrentFileIndex,
    dragActive,
    setDragActive,
    upload,
  } = useFileUpload();

  const { estimatedValues, setEstimatedValues } = UseUser();
  const [loadTimes, setLoadTimes] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [, setSelectedMaterial] = useState<Material | null>(null);
  const [globalSettings, setGlobalSettings] =
    useState<Omit<FileState, "file" | "status" | "uploadProgress">>(
      defaultSettings
    );

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await axios.get("/materials.json");
        setMaterials(response.data);
        const defaultMaterial = response.data.find(
          (mat: Material) => mat.name === "PLA"
        );
        setSelectedMaterial(defaultMaterial);
      } catch (error) {
        console.error("Error fetching materials:", error);
      }
    };

    fetchMaterials();
  }, []);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const newFileStates: FileState[] = newFiles.map((file) => ({
        file,
        status: "idle",
        uploadProgress: 0,
        ...defaultSettings,
      }));

      setFileStates((prevStates) => {
        const updatedStates = [...prevStates, ...newFileStates];
        // Start uploading each new file after state update
        newFileStates.forEach((_, index) => {
          upload(prevStates.length + index, updatedStates);
        });
        return updatedStates;
      });

      setCurrentFileIndex(fileStates.length);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFileChange({
        target: { files: event.dataTransfer.files },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleDeleteFile = () => {
    setFileStates((prevStates) =>
      prevStates.filter((_, index) => index !== currentFileIndex)
    );
    setCurrentFileIndex((prevIndex) =>
      Math.min(prevIndex, fileStates.length - 2)
    );
  };

  const handleAddFile = () => {
    document.getElementById("fileInput")?.click();
  };

  const handleLoadTime = (index: number, loadTime: string) => {
    setLoadTimes((prevTimes) => {
      const newTimes = [...prevTimes];
      newTimes[index] = loadTime;
      return newTimes;
    });
  };

  const handleEstimateStart = (index: number) => {
    setEstimatedValues((prevValues) => ({
      ...prevValues,
      [index]: null,
    }));
  };

  const handleEstimateComplete = (
    index: number,
    price: number,
    time: string,
    weight: number
  ) => {
    setEstimatedValues((prevValues) => ({
      ...prevValues,
      [index]: { price, time, weight },
    }));
    fileStates[index].status = "estimated";
  };

  const renderFileContent = () => {
    const currentFile = fileStates[currentFileIndex];

    if (currentFile.status === "uploading") {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <p className="mt-4">
            Uploading: {currentFile.uploadProgress.toFixed(0)}%
          </p>
        </div>
      );
    }

    if (currentFile.status === "uploaded") {
      return <STLViewer file={currentFile.file} />;
    }

    if (currentFile.status === "error") {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <p className="text-red-500">
            Error uploading file. Please try again.
          </p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <p>Preparing your file...</p>
      </div>
    );
  };

  const handleSettingsChange = (
    type: "material" | "infill" | "quality" | "color",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    fileIndex?: number
  ) => {
    if (typeof fileIndex === "number") {
      const initialPrice = fileStates[fileIndex].initialPrice || 0;
      if (type === "infill") {
        if (estimatedValues[fileIndex]) {
          estimatedValues[fileIndex].price =
            initialPrice * (1 + (value / 80 - 0.25));
        }
      }

      if (type === "quality") {
        if (estimatedValues[fileIndex]) {
          estimatedValues[fileIndex].price =
            initialPrice * (value === "high" ? 1.3 : 1);
        }
      }

      // Update specific file settings
      setFileStates((prevStates) => {
        const newStates = [...prevStates];
        newStates[fileIndex] = {
          ...newStates[fileIndex],
          [type]: value,
        };
        return newStates;
      });
    } else {
      // Update global settings
      setGlobalSettings((prev) => ({
        ...prev,
        [type]: value,
      }));
    }
  };

  const renderSettingsPanel = () => {
    const settings =
      fileStates.length > 0 ? fileStates[currentFileIndex] : globalSettings;

    return (
      <div className="lg:block h-full flex flex-col">
        <SettingsPanel
          materials={materials}
          selectedMaterial={settings.material || null}
          infillValue={settings.infill ?? 0}
          quality={settings.quality ?? "normal"}
          color={settings.color || "defaultColor"}
          onMaterialChange={(materialName) => {
            const material = materials.find((mat) => mat.name === materialName);
            if (material) {
              handleSettingsChange(
                "material",
                material,
                fileStates.length > 0 ? currentFileIndex : undefined
              );
            }
          }}
          onInfillChange={(value) =>
            handleSettingsChange(
              "infill",
              value[0],
              fileStates.length > 0 ? currentFileIndex : undefined
            )
          }
          onQualityChange={(quality: "normal" | "high") =>
            handleSettingsChange(
              "quality",
              quality,
              fileStates.length > 0 ? currentFileIndex : undefined
            )
          }
          onColorChange={(color: string) =>
            handleSettingsChange(
              "color",
              color,
              fileStates.length > 0 ? currentFileIndex : undefined
            )
          }
        >
          {fileStates.length > 0 && (
            <div className="flex-grow">
              {" "}
              {/* Allow PriceSummary to grow and take full height */}
              <PriceSummary
                fileStates={fileStates}
                estimatedValues={estimatedValues}
              />
            </div>
          )}
        </SettingsPanel>
      </div>
    );
  };

  const renderMaterialCard = () => {
    const selectedMaterial =
      fileStates.length > 0
        ? fileStates[currentFileIndex].material
        : globalSettings.material;

    return (
      <MaterialCard
        material={selectedMaterial || defaultMaterial}
        materialImages={materialImages}
      />
    );
  };

  return (
    <div className="flex gap-4 h-[80vh]">
      {/* Material Info Card */}
      {renderMaterialCard()}

      {/* Main Content Area */}
      <div className="flex flex-row flex-grow flex-wrap justify-center lg:flex-nowrap">
        <div
          className="flex flex-col items-center justify-center w-full col-span-1 border rounded-lg relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {fileStates.length > 0 ? (
            <>
              {/* File Actions */}
              <div className="flex place-self-end m-4 absolute top-0">
                <Button
                  variant="outline"
                  size="icon2"
                  onClick={handleDeleteFile}
                >
                  <TrashIcon color="red" className="h-8 w-8" />
                </Button>
                <Button
                  variant="outline"
                  size="icon2"
                  className="ml-2"
                  onClick={handleAddFile}
                >
                  <PlusIcon className="h-8 w-8" />
                  <input
                    id="fileInput"
                    type="file"
                    accept=".stl"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </Button>
              </div>

              {/* File Content */}
              {renderFileContent()}

              {/* Estimator */}
              <div className="absolute bottom-16">
                <Estimator
                  unit="mm"
                  fileState={fileStates[currentFileIndex]}
                  estimatedValues={estimatedValues[currentFileIndex]}
                  loadTime={loadTimes[currentFileIndex]}
                  onEstimateStart={() => {
                    setFileStates((prevStates) => {
                      const newStates = [...prevStates];
                      newStates[currentFileIndex] = {
                        ...newStates[currentFileIndex],
                        isEstimating: true,
                      };
                      return newStates;
                    });
                    handleEstimateStart(currentFileIndex);
                  }}
                  onEstimateComplete={(price, time, weight) => {
                    setFileStates((prevStates) => {
                      const newStates = [...prevStates];
                      newStates[currentFileIndex] = {
                        ...newStates[currentFileIndex],
                        isEstimating: false,
                        initialPrice: price,
                      };
                      return newStates;
                    });
                    handleEstimateComplete(
                      currentFileIndex,
                      price,
                      time,
                      weight
                    );
                  }}
                  onLoadTime={(loadTime) =>
                    handleLoadTime(currentFileIndex, loadTime)
                  }
                  uploadedUrl={fileStates[currentFileIndex].url || ""}
                  uploadedVolume={fileStates[currentFileIndex].volume || 0}
                />
              </div>

              {/* Pagination */}
              <Pagination className="absolute bottom-0 mb-4">
                <PaginationPrevious
                  onClick={() =>
                    setCurrentFileIndex(
                      (prev) =>
                        (prev - 1 + fileStates.length) % fileStates.length
                    )
                  }
                />
                <PaginationContent>
                  {fileStates.map((_, index) => (
                    <PaginationItem key={index}>
                      <PaginationLink
                        isActive={index === currentFileIndex}
                        onClick={() => setCurrentFileIndex(index)}
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                </PaginationContent>
                <PaginationNext
                  onClick={() =>
                    setCurrentFileIndex(
                      (prev) => (prev + 1) % fileStates.length
                    )
                  }
                />
              </Pagination>
            </>
          ) : (
            <FileUploadArea
              dragActive={dragActive}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileChange={handleFileChange}
            />
          )}
        </div>

        <div className="flex flex-col gap-2 w-full space-y-2 pl-16 pr-16 pt-8 ml-0 lg:pl-2 lg:pr-2 lg:pt-0 lg:ml-4 lg:w-1/4">
          {/* Settings Panel */}
          {renderSettingsPanel()}

          {/* Price Summary
          {fileStates.length > 0 && (
            <PriceSummary
              fileStates={fileStates}
              estimatedValues={estimatedValues}
            />
          )} */}
        </div>
      </div>
    </div>
  );
}
