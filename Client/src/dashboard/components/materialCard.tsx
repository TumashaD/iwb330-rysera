import { Card, CardContent } from "@/components/ui/card";
import { Material } from "../../types";

interface MaterialCardProps {
  material: Material | null;
  materialImages: { [key: string]: string };
}

export function MaterialCard({ material, materialImages }: MaterialCardProps) {
  if (!material) return null;

  return (
    <Card className="p-6 w-[20vw] hidden lg:block mr-6">
      <div className="mb-2">
      <img
        src={materialImages[material.name]}
        alt={`${material.name} Filament`}
        className="w-full h-auto rounded-lg"
      />
      </div>
      <CardContent className="p-0">
      <div>
        <p className="font-semibold">{material.name}</p>
        <p className="text-sm mb-3">{material.description}</p>
        <p className="text-sm">
        <strong>Tensile strength:</strong> {material.properties.Tensile}
        </p>
        <p className="text-sm">
        <strong>Tensile elongation:</strong>{" "}
        {material.properties.elongation}
        </p>
        <p className="text-sm">
        <strong>Flexural strength:</strong> {material.properties.Flexural}
        </p>
        <p className="text-sm">
        <strong>HDT (0.45 MPa):</strong> {material.properties.HDT}
        </p>
      </div>
      </CardContent>
    </Card>
  );
}
