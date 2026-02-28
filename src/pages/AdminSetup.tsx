import { Navigate } from "react-router-dom";

const AdminSetup = () => {
  return <Navigate to="/admin/login?mode=setup" replace />;
};

export default AdminSetup;
