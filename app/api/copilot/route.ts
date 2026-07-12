import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeVehicleMetrics } from "@/lib/reports/computeVehicleMetrics";

// Use standard Web Streams for streaming response
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FLEET_MANAGER") {
      return new Response(JSON.stringify({ error: "Unauthorized. Copilot is restricted to Fleet Managers." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { question } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Fetch RAG-lite Context Bundle from DB
    const [vehiclesInShop, expiringDrivers, activeTrips, allVehicles] = await Promise.all([
      // Vehicles currently in shop
      prisma.vehicle.findMany({
        where: { status: "IN_SHOP" },
        select: { 
          regNumber: true, 
          name: true, 
          region: true,
          maintenanceLogs: {
            where: { status: "ACTIVE" },
            select: { description: true }
          }
        }
      }),
      // Drivers with issues (suspended or expiring in < 30 days)
      prisma.driverProfile.findMany({
        where: {
          OR: [
            { status: "SUSPENDED" },
            { licenseExpiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
          ]
        },
        select: { name: true, status: true, licenseExpiryDate: true }
      }),
      // Active Dispatched Trips
      prisma.trip.findMany({
        where: { status: "DISPATCHED" },
        select: {
          source: true, destination: true,
          vehicle: { select: { regNumber: true } },
          driver: { select: { name: true } }
        }
      }),
      // All Vehicles for ROI calculation
      prisma.vehicle.findMany({
        include: {
          trips: { where: { status: "COMPLETED" } },
          maintenanceLogs: true,
          fuelLogs: true,
          expenses: true,
        }
      })
    ]);

    const vehicleMetrics = allVehicles.map(v => computeVehicleMetrics(v as any));

    const contextBundle = {
      vehiclesInShop: vehiclesInShop.map(v => ({
        regNumber: v.regNumber,
        name: v.name,
        region: v.region,
        reason: v.maintenanceLogs[0]?.description || "Routine maintenance"
      })),
      driversWithIssues: expiringDrivers.map(d => ({
        name: d.name,
        status: d.status,
        expiresInDays: Math.ceil((new Date(d.licenseExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      })),
      activeTrips: activeTrips.map(t => ({
        route: `${t.source} to ${t.destination}`,
        vehicle: t.vehicle.regNumber,
        driver: t.driver.name
      })),
      vehicleROI: vehicleMetrics.map(m => ({
        vehicle: m.regNumber,
        roiPercentage: `${(m.roi * 100).toFixed(2)}%`
      }))
    };

    const systemPrompt = `CRITICAL RULE: Perform STRICT, EXACT MATCHING for vehicle registration numbers. Do NOT perform fuzzy matching, guess typos, or assume "VAN-05" means "VAN-005". If the exact ID requested by the user does not explicitly exist in the context, you MUST reply: "I don't have data on that right now."

Example Interaction:
User: "What's the ROI on VAN-05"
(Context contains VAN-005 but NOT VAN-05)
Assistant: "I don't have data on that right now."

You are TransitOps Fleet Copilot, an AI assistant for a fleet management system. 
You are speaking to a fleet manager or dispatcher.
Answer their questions CONCISELY (2-3 sentences max) using ONLY the provided real-time database context. 
NEVER invent numbers, vehicles, or drivers. 
If the data doesn't answer the question, explicitly say "I don't have data on that right now."
If asked about a vehicle's ROI or Return on Investment, look up its 'roiPercentage' in the 'vehicleROI' list and report it as a percentage (e.g., "TRK-001 has an ROI of 15.2%").
Format output clearly, using bolding for vehicle numbers or names.`;

    const userPrompt = `Real-time Database Context:
${JSON.stringify(contextBundle, null, 2)}

User Question: ${question}`;

    // 2. Call Groq API with Streaming
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: true,
      })
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error("Groq Error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to communicate with AI provider" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Pass the stream directly back to the client
    return new Response(groqRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error) {
    console.error("Copilot Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
