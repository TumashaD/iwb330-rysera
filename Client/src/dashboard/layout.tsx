import { Outlet } from "react-router-dom";
import Header from "./components/header";

export default function DashboardLayout() {
  return (
    <div className="bg-white text-black">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="mx-auto py-8">
        <Outlet />
      </div>
    </div>
  );
}
