import { Outlet } from "react-router-dom";
import Header from "./components/header";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="mx-auto py-8 mx-3.5">
        <Outlet />
      </div>
    </div>
  );
}
