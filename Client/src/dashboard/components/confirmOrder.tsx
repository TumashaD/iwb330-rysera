import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Order } from "@/models";
import { sendOrders } from "@/services/order";
import { useNavigate } from "react-router-dom";

interface ConfirmAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
}

export function ConfirmAlert({
  open,
  onOpenChange,
  orders,
}: ConfirmAlertProps) {
  const navigate = useNavigate();
  const handleSendOrder = async () => {
    await sendOrders(orders);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Order</AlertDialogTitle>
          <AlertDialogDescription>
            Please review and confirm your order
          </AlertDialogDescription>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 pr-4">
                {orders.map((order, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-gray-100 gap-5"
                  >
                    <span className="text-sm truncate max-w-[140px]">
                      {order.fileName}
                    </span>
                    <span className="text-sm font-medium">
                      Rs.{order.price}
                    </span>
                  </div>
                ))}
              </ScrollArea>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">
                    Rs.
                    {orders
                      .reduce((sum, order) => sum + parseInt(order.price), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              handleSendOrder();
              onOpenChange(false);
              navigate("/dashboard/orders");
            }}
          >
            Confirm Order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
