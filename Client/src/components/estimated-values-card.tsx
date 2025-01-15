'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EstimatedValuesCardProps {
  estimatedPrice: number;
  printDuration: string;
  materialWeight: string;
  loadTime: string;
}

export function EstimatedValuesCard({ estimatedPrice, printDuration, materialWeight , loadTime }: EstimatedValuesCardProps) {
  return (
    <Card className="w-[80vw] lg:w-[315px] mb-4">
      <CardHeader>
        <CardTitle>Estimated Values</CardTitle>
        <p className="text-sm text-muted-foreground">Generated in {loadTime} s</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Estimated Price</span>
          <span className="text-lg font-semibold text-orange-500">Rs. {estimatedPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Print Duration</span>
          <span className="text-sm">{printDuration}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Material Weight</span>
          <span className="text-sm">{materialWeight} g</span>
        </div>
      </CardContent>
    </Card>
  )
}