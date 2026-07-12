import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/vehicles/:path*",
    "/vehicles",
    "/drivers/:path*",
    "/drivers",
    "/trips/:path*",
    "/trips",
    "/maintenance/:path*",
    "/maintenance",
    "/fuel-expenses/:path*",
    "/fuel-expenses",
  ],
}
