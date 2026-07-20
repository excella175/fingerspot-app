const FINGERSPOT_API_URL =
  process.env.FINGERSPOT_API_URL || "https://developer.fingerspot.io/api";
const FINGERSPOT_API_KEY = process.env.FINGERSPOT_API_KEY || "";
const FINGERSPOT_CLOUD_ID = process.env.FINGERSPOT_CLOUD_ID || "";

export interface FingerspotResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  errorCode?: string;
}

async function callAPI(
  endpoint: string,
  body: Record<string, any>,
): Promise<FingerspotResponse> {
  try {
    const response = await fetch(`${FINGERSPOT_API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FINGERSPOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cloud_id: FINGERSPOT_CLOUD_ID,
        ...body,
      }),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `Non-JSON response (${response.status}): ${text.substring(0, 200)}`,
      };
    }

    if (!response.ok || data.success === false) {
      return {
        success: false,
        error: data.message || data.error || `API error ${response.status}`,
        errorCode: data.error_code,
        data,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// ATTENDANCE
// ============================================

export async function getAttlog(startDate: string, endDate: string) {
  return callAPI("get_attlog", {
    trans_id: Date.now().toString(),
    start_date: startDate,
    end_date: endDate,
  });
}

// ============================================
// USER MANAGEMENT
// ============================================

export async function getUserInfo(pin: string, name: string, transId?: string) {
  return callAPI("get_userinfo", {
    pin,
    name,
    trans_id: transId || Date.now().toString(),
  });
}

export async function setUserInfo(userData: {
  pin: string;
  name: string;
  password?: string;
  card?: string;
  privilege?: string;
}) {
  return callAPI("set_userinfo", {
    trans_id: Date.now().toString(),
    data: {
      pin: userData.pin,
      name: userData.name,
      password: userData.password || "",
      rfid: userData.card || "",
      privilege: userData.privilege || "1",
      template: "",
    },
  });
}

export async function deleteUserInfo(pin: string) {
  return callAPI("delete_userinfo", { trans_id: Date.now().toString(), pin });
}

export async function getAllPin(transId?: string) {
  return callAPI("get_all_pin", { trans_id: transId || Date.now().toString() });
}

export async function registerOnline(pin: string, verification: string = "0") {
  return callAPI("reg_online", {
    trans_id: Date.now().toString(),
    pin,
    verification,
  });
}

// ============================================
// DEVICE MANAGEMENT
// ============================================

export async function getDevice(transId?: string) {
  return callAPI("get_device", { trans_id: transId || Date.now().toString() });
}

export async function setTime(timezone: string = "Asia/Jakarta") {
  return callAPI("set_time", { trans_id: Date.now().toString(), timezone });
}

export async function restartDevice(transId?: string) {
  return callAPI("restart_device", {
    trans_id: transId || Date.now().toString(),
  });
}

// ============================================
// QR CODE (VIDA Series)
// ============================================

export async function setQrCode(pin: string, qrString: string) {
  return callAPI("set_qrcode", {
    trans_id: Date.now().toString(),
    pin,
    qr_string: qrString,
  });
}

export async function getQrCode(pin: string) {
  return callAPI("get_qrcode", {
    trans_id: Date.now().toString(),
    pin,
  });
}
