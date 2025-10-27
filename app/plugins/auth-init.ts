export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();

  auth.init();
  if (auth.token && !auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      // invalid token হলে state clear হবে; ignore
    }
  }
});
