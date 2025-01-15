import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/loadingButton";
import { EstimatedValuesCard } from "@/components/estimated-values-card";
import { getEstimate } from "../../services/estimator";
import { EstimatorProps } from "../../types";

const Estimator: React.FC<EstimatorProps> = ({
  fileState,
  unit,
  estimatedValues,
  loadTime,
  onEstimateStart,
  onEstimateComplete,
  onLoadTime,
}) => {
  const [error, setError] = useState<string | null>(null);
  const status = fileState.status;
  const isEstimating = fileState.isEstimating;

  const handleEstimate = async () => {
    if (estimatedValues) {
      return;
    }

    onEstimateStart?.();
    setError(null);

    const startTime = performance.now();

    try {
      const estimateResult = await getEstimate(fileState.file);

      if (fileState.quality === "high") {
        estimateResult.price = estimateResult.price * 1.3;
      }

      if (fileState.infill) {
        estimateResult.price =
          estimateResult.price * (1 + (fileState.infill / 80 - 0.25));
      }

      onEstimateComplete?.(estimateResult.price, estimateResult.time.toString(), estimateResult.weight);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      onLoadTime?.(duration);
    }
  };

  return (
    <div>
      {!estimatedValues && !isEstimating && (
        <Button
          variant="default"
          size="lg"
          className="mb-6"
          onClick={handleEstimate}
          disabled={status !== "idle"}
        >
          Estimate Price
        </Button>
      )}
      {isEstimating && !estimatedValues && <ButtonLoading />}
      {estimatedValues && (
        <EstimatedValuesCard
          loadTime={loadTime}
          estimatedPrice={estimatedValues.price}
          printDuration={estimatedValues.time}
          materialWeight={estimatedValues.weight.toFixed(2)}
        />
      )}
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default Estimator;
