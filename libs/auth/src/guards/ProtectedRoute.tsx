import { Navigate, Outlet } from "react-router-dom"
import { Box } from "@mui/material"
import { NavBar } from "@item-bank/ui";

const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  if(!token) return <Navigate replace to={'/login'} />
  return (
    <Box className="w-full min-w-0 overflow-hidden">
      <NavBar />
      <Outlet />
    </Box>
  )
}

export default ProtectedRoute