import { Navigate, Outlet } from "react-router-dom"

const GuestRoute = () => {
  const token = localStorage.getItem("token");
  if(token) return <Navigate replace to={'/home'} />
  return <Outlet />
}

export default GuestRoute