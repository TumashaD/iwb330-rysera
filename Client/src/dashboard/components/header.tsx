import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UseUser } from "@/context";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const { user } = UseUser();
  const navigate = useNavigate();
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-base font-semibold lg:text-xl">
          Rysera - 3D Printing
        </h1>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <Button
                className="bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800"
                onClick={() => navigate("/dashboard/orders")}
              >
                View Orders
              </Button>
              <Avatar>
                <AvatarImage src={user.avatar} referrerPolicy="no-referrer" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
