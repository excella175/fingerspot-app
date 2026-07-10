import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fingerspot from "@/lib/fingerspot";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, cloudId, params } = body;

    const startTime = Date.now();
    let result;

    switch (command) {
      // Attendance
      case "get_attlog":
        result = await fingerspot.getAttlog(params.startDate, params.endDate);
        break;

      // User Management
      case "get_userinfo":
        result = await fingerspot.getUserInfo(params.pin, params.transId);
        break;
      case "set_userinfo":
        result = await fingerspot.setUserInfo(params);
        break;
      case "delete_userinfo":
        result = await fingerspot.deleteUserInfo(params.pin);
        break;
      case "get_all_pin":
        result = await fingerspot.getAllPin(params.transId);
        break;
      case "reg_online":
        result = await fingerspot.registerOnline(params.pin, params.verification);
        break;

      // Device Management
      case "get_device":
        result = await fingerspot.getDevice(params.transId);
        break;
      case "set_time":
        result = await fingerspot.setTime(params.timezone);
        break;
      case "restart_device":
        result = await fingerspot.restartDevice(params.transId);
        break;

      // QR Code (VIDA Series)
      case "set_qrcode":
        result = await fingerspot.setQrCode(params.pin, params.qrString);
        break;
      case "get_qrcode":
        result = await fingerspot.getQrCode(params.pin);
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Unknown command" },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    await prisma.apiLog.create({
      data: {
        command,
        deviceCloudId: cloudId || process.env.FINGERSPOT_CLOUD_ID || "",
        transId: params?.transId || null,
        status: result.success ? "SUCCESS" : "FAILED",
        requestPayload: body as any,
        responsePayload: result.data || null,
        errorMessage: result.error || null,
        duration,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
