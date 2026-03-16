import { Navigate } from "react-router-dom"

const NotFoundRedirect = () => {
    const token = localStorage.getItem("token")
    return <Navigate replace to={token ? '/home' : '/login'} />
}

export default NotFoundRedirect