const { templateIds, reminderLeadMinutes } = require("../config/subscribe");
const { REMINDER_API_BASE } = require("../config/env");

function validTemplateIds() {
  return templateIds.filter((id) => id && !id.startsWith("REPLACE_WITH"));
}

function requestMatchReminder(match) {
  return new Promise((resolve, reject) => {
    const ids = validTemplateIds();

    if (!ids.length) {
      return resolve({ mode: "mock", accepted: false, message: "还没填订阅消息模板 ID，当前只走本地占位。" });
    }

    wx.requestSubscribeMessage({
      tmplIds: ids,
      success(result) {
        const accepted = ids.some((id) => result[id] === "accept");
        const payload = {
          matchId: match?.id || "",
          matchLabel: `${match?.teamA?.shortName || "--"} vs ${match?.teamB?.shortName || "--"}`,
          matchDate: match?.matchDate || "",
          reminderLeadMinutes,
          accepted,
          requestedAt: Date.now(),
        };
        const queued = wx.getStorageSync("esportsmonk:reminders") || [];
        wx.setStorageSync("esportsmonk:reminders", [payload, ...queued].slice(0, 20));
        if (accepted && REMINDER_API_BASE) {
          wx.request({ url: `${REMINDER_API_BASE}/reminders`, method: "POST", data: payload });
        }
        resolve({ mode: "live", accepted, message: accepted ? "提醒已记下，等后台模板消息补齐就能发。" : "你没点同意，提醒没记上。" });
      },
      fail: reject,
    });
  });
}

module.exports = { requestMatchReminder };
