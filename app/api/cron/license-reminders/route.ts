import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

export async function GET(req: Request) {
  try {
    // Only allow cron requests if env is set, or allow manual trigger via auth header (simplified for demo)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !req.url.includes("manual=true")) {
      // In a real app we'd strict-check CRON_SECRET. For the hackathon demo, we allow manual trigger.
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiringDrivers = await prisma.driverProfile.findMany({
      where: {
        licenseExpiryDate: {
          gte: today,
          lte: thirtyDaysFromNow,
        },
        status: {
          not: "SUSPENDED"
        }
      },
    });

    if (expiringDrivers.length === 0) {
      return NextResponse.json({ message: "No drivers expiring in the next 30 days." });
    }

    const emailHtml = `
      <h2>License Expiry Alert</h2>
      <p>The following drivers have licenses expiring in the next 30 days:</p>
      <ul>
        ${expiringDrivers.map(d => `
          <li>
            <strong>${d.name}</strong> (${d.licenseNumber}) - Expires: ${new Date(d.licenseExpiryDate).toLocaleDateString()}
          </li>
        `).join('')}
      </ul>
      <p>Please take action immediately to renew these licenses.</p>
    `;

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "TransitOps Alerts <onboarding@resend.dev>",
        to: "fleet-manager@transitops.com", // Assume this is the registered fleet manager email
        subject: "Action Required: Expiring Driver Licenses",
        html: emailHtml,
      });
    } else {
      console.log("MOCK EMAIL SENT:", emailHtml);
    }

    return NextResponse.json({ 
      success: true, 
      count: expiringDrivers.length,
      mocked: !process.env.RESEND_API_KEY
    });
  } catch (error: any) {
    console.error("Cron failed:", error);
    return NextResponse.json({ error: "Failed to run cron" }, { status: 500 });
  }
}
