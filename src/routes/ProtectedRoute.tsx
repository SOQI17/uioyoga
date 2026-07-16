import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('superadmin' | 'admin' | 'instructor' | 'student')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuthStore();
  const { tenantId, tenantInfo, tenantExists, loadingTenant } = useTenantStore();
  const location = useLocation();

  if (loading || loadingTenant) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-marfil">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-salvia"></div>
      </div>
    );
  }

  // 1. If studio does not exist (and we're not on the central platform), block access
  if (!tenantExists && tenantId !== 'uioyoga') {
    return <Navigate to="/suspended" state={{ type: 'not_found' }} replace />;
  }

  // 2. Auth Check
  if (!user || !userData) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Superadmin bypasses tenant matching and subscription checks
  if (userData.role === 'superadmin') {
    return <>{children}</>;
  }

  // 4. Verify user belongs to the current tenant / subdomain
  const cleanUserTenant = userData.tenantId?.replace('.uioyoga.com', '').replace(/\s+/g, '').toLowerCase();
  const cleanDetectedTenant = tenantId?.replace('.uioyoga.com', '').replace(/\s+/g, '').toLowerCase();
  const cleanInfoTenantId = tenantInfo?.id?.replace('.uioyoga.com', '').replace(/\s+/g, '').toLowerCase();

  const isMatchingTenant = cleanUserTenant === cleanDetectedTenant || cleanUserTenant === cleanInfoTenantId;

  if (!isMatchingTenant) {
    console.warn("Unauthorized access: User belongs to a different tenant.");
    return <Navigate to="/login" replace />;
  }

  // 5. Subscription Check
  const status = tenantInfo?.status;
  const isSuspended = status === 'suspended';
  
  const isExpired = tenantInfo?.subscriptionExpiry 
    ? new Date(tenantInfo.subscriptionExpiry) < new Date() 
    : false;

  const isTrialExpired = status === 'trial' && tenantInfo?.trialEndsAt
    ? new Date(tenantInfo.trialEndsAt) < new Date()
    : false;

  if (isSuspended || isExpired || isTrialExpired) {
    const blockType = isSuspended ? 'suspended' : 'expired';
    return <Navigate to="/suspended" state={{ type: blockType }} replace />;
  }

  // 6. Role check
  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
