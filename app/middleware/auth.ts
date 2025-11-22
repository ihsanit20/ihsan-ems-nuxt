// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();
  const tenant = useTenantStore();

  // 1) Ensure tenant meta is loaded (safe on SSR/CSR)
  if (tenant.status === "idle") {
    try {
      await tenant.fetchMeta();
    } catch {
      /* ignore */
    }
  }

  // 2) Block inactive tenants (optional)
  if (
    tenant.meta &&
    tenant.meta.status &&
    tenant.meta.status.active === false
  ) {
    return abortNavigation(
      createError({ statusCode: 403, statusMessage: "Tenant inactive" })
    );
  }

  // 3) Already authenticated?
  //    If your store has a boolean like `isAuthenticated`, use that.
  if (
    (auth as any).isAuthenticated ? (auth as any).isAuthenticated : auth.user
  ) {
    // Proceed to role checks below
  } else {
    // 4) Try to hydrate session (SSR-safe)
    try {
      await auth.fetchMe?.();
    } catch {
      /* ignore */
    }

    if (!auth.user) {
      const redirect =
        to.fullPath && to.fullPath !== "/"
          ? `?redirect=${encodeURIComponent(to.fullPath)}`
          : "";
      return navigateTo(`/auth/login${redirect}`);
    }
  }

  const role = auth.user?.role || "";
  const metaRoles = (to.meta?.roles as string[] | undefined)?.filter(Boolean);

  // 5) Route-level role guard (if page declares roles)
  if (metaRoles?.length && !metaRoles.includes(role)) {
    return abortNavigation(
      createError({ statusCode: 403, statusMessage: "Forbidden" })
    );
  }

  // 6) Admin shell hard guard — block guardian/student from admin area
  const adminRoles = ["Owner", "Admin", "Developer", "Teacher"];
  if (to.path.startsWith("/admin") && !adminRoles.includes(role)) {
    return abortNavigation(
      createError({ statusCode: 403, statusMessage: "Admins only" })
    );
  }
});
