import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UseUser } from "@/userContext";
import { useNavigate } from "react-router-dom";
import { Order } from "@/types";
import { useState, useEffect } from "react";
import { ConfirmAlert } from "./confirmOrder";
import Quantity from "../components/qunatityInput";

interface PriceSummaryProps {
  fileStates: Array<{
    file: File;
    status: string;
    url?: string;
  }>;
  estimatedValues: {
    [key: number]: {
      price: number;
      time: string;
      weight: number;
    } | null;
  };
}

const PriceSummary = ({ fileStates, estimatedValues }: PriceSummaryProps) => {
  const { user, orders, setOrders } = UseUser();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [quantities, setQuantities] = useState<number[]>(
    fileStates.map(() => 1)
  );

  useEffect(() => {
    setQuantities(fileStates.map(() => 1));
  }, [fileStates]);

  const handleQuantityChange = (index: number, quantity: number) => {
    setQuantities((prevQuantities) => {
      const newQuantities = [...prevQuantities];
      newQuantities[index] = quantity;
      return newQuantities;
    });
  };

  // Check if at least one file has been estimated
  const hasEstimates = Object.values(estimatedValues).some(
    (value) => value !== null
  );

  // If no estimates yet, don't render anything
  if (!hasEstimates) {
    return null;
  }
  const handleSendToPrint = () => {
    if (!user) {
      navigate("/auth/signin");
    } else {
      // Send to print
      const orders: Order[] = fileStates
        .map((fileState, index) => {
          if (estimatedValues[index]) {
            return {
              orderDate: new Date().toISOString(),
              uid: user.uid,
              fileName: fileState.file.name.replace(/\.STL$/i, ""),
              status: "pending",
              printTime: estimatedValues[index].time,
              price: estimatedValues[index].price.toFixed(2),
              quantity: quantities[index],
              url: fileState.url,
            };
          }
        })
        .filter((order) => order !== undefined) as Order[];

      setOrders(orders);
      setIsConfirmOpen(true);
    }
  };

  const calculateTotal = () => {
    return Object.values(estimatedValues)
      .filter(
        (value): value is { price: number; time: string; weight: number } =>
          value !== null
      )
      .reduce((sum, value, index) => sum + value.price * quantities[index], 0);
  };

  return (
    <div className="w-[80vw] lg:w-[24vw]">
      <Card className="flex flex-col flex-grow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Price Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-grow px-4">
          <ScrollArea className="flex-grow pr-4">
            {fileStates.map((fileState, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-2 border-b border-gray-100 gap-5"
              >
                {estimatedValues[index] && (
                  <>
                  <div className="flex items-center gap-2 truncate">
                    <Quantity
                      value={quantities[index]}
                      onChange={(value) => handleQuantityChange(index, value)}
                    />
                    <span className="text-sm ">
                      {fileState.file.name.replace(/\.STL$/i, "")}
                    </span>
                    </div>
                    <span className="text-sm font-medium">
                      Rs.{estimatedValues[index].price.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            ))}
          </ScrollArea>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">
                Rs.{calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-center mt-4">
        <Button className="w-full" onClick={handleSendToPrint}>
          Send to Print
        </Button>
        <ConfirmAlert
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          orders={orders}
          user={user}
        />
      </div>
    </div>
  );
};

export default PriceSummary;
