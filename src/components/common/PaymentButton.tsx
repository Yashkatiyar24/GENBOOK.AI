import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

type PaymentButtonProps = {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: any) => void;
  className?: string;
  children?: React.ReactNode;
};

export function PaymentButton({
  amount,
  currency = "INR",
  description = "Payment for service",
  onSuccess,
  onError,
  className,
  children,
}: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      // Create an order on your server
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to paise
          currency,
          notes: {
            description,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create order");
      }

      const order = await response.json();

      // Load Razorpay script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        // @ts-ignore
        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "Your Company Name",
          description: description,
          order_id: order.id,
          handler: function (response: any) {
            toast.success("Payment successful!");
            onSuccess?.(response.razorpay_payment_id);
          },
          prefill: {
            name: "Customer Name", // You can pre-fill customer details if available
            email: "customer@example.com",
            contact: "+919999999999",
          },
          notes: {
            description: description,
          },
          theme: {
            color: "#2563eb",
          },
          modal: {
            ondismiss: function () {
              toast.info("Payment window closed");
            },
          },
        });

        rzp.on("payment.failed", function (response: any) {
          const errorMessage = response.error?.description || "Payment failed";
          toast.error(errorMessage);
          onError?.(response.error);
        });

        rzp.open();
      };

      document.body.appendChild(script);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to process payment");
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={isLoading}
      className={className}
    >
      {isLoading ? "Processing..." : children || `Pay ${currency} ${amount}`}
    </Button>
  );
}
