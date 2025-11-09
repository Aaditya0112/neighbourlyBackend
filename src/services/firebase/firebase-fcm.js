import { firebaseAdmin } from "./firebase-admin.js";

function _normalizeData(data = {}) {
  // FCM requires string values in data payload
  return Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [k, v == null ? "" : String(v)])
  );
}

/**
 * Send a notification to a single device token.
 * Returns the messageId on success.
 */
export async function sendPush(fcmToken, title, body, data = {}) {

    console.log("inside sendPush fcm");
  if (!fcmToken) return null;

  const message = {
    token: fcmToken,
    notification: title || body ? { title: title || "", body: body || "" } : undefined,
    data: Object.keys(data || {}).length ? _normalizeData(data) : undefined,
    android: { priority: "high" },
    apns: { headers: { "apns-priority": "10" } },
  };

  console.log("message:", message);
  const resp = await firebaseAdmin.messaging().send(message);
  console.log("FCM send response:", resp);
  return resp;
}

/**
 * Send a message to multiple device tokens (up to 500 tokens per call).
 * Returns the BatchResponse from firebase-admin.
 */
export async function sendMulticast(fcmTokens = [], title, body, data = {}) {
  if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) return null;

  const message = {
    tokens: fcmTokens,
    notification: title || body ? { title: title || "", body: body || "" } : undefined,
    data: Object.keys(data || {}).length ? _normalizeData(data) : undefined,
    android: { priority: "high" },
    apns: { headers: { "apns-priority": "10" } },
  };

  const resp = await firebaseAdmin.messaging().sendMulticast(message);
  return resp;
}

/**
 * Send to a topic.
 */
export async function sendToTopic(topic, title, body, data = {}) {
  if (!topic) return null;

  const message = {
    topic,
    notification: title || body ? { title: title || "", body: body || "" } : undefined,
    data: Object.keys(data || {}).length ? _normalizeData(data) : undefined,
    android: { priority: "high" },
    apns: { headers: { "apns-priority": "10" } },
  };

  const resp = await firebaseAdmin.messaging().send(message);
  return resp;
}

export async function subscribeToTopic(fcmTokens = [], topic) {
  if (!Array.isArray(fcmTokens) || fcmTokens.length === 0 || !topic) return null;
  return firebaseAdmin.messaging().subscribeToTopic(fcmTokens, topic);
}

export async function unsubscribeFromTopic(fcmTokens = [], topic) {
  if (!Array.isArray(fcmTokens) || fcmTokens.length === 0 || !topic) return null;
  return firebaseAdmin.messaging().unsubscribeFromTopic(fcmTokens, topic);
}

export default {
  sendPush,
  sendMulticast,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
};
