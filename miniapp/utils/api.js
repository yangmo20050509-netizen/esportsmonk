const { PROD_SITE_DATA_URL, CACHE_TTL_MS } = require("../config/env");
const mockSiteData = require("../mock/site-data");

const CACHE_KEY = "esportsmonk:siteData";
const CACHE_TIME_KEY = "esportsmonk:siteDataTime";

function request(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: "GET",
      timeout: 10000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(res.data);
        reject(new Error(`HTTP ${res.statusCode}`));
      },
      fail: reject,
    });
  });
}

async function fetchSiteData(force = false) {
  const cachedAt = Number(wx.getStorageSync(CACHE_TIME_KEY) || 0);
  const cached = wx.getStorageSync(CACHE_KEY);
  const stillFresh = Date.now() - cachedAt < CACHE_TTL_MS;

  if (!force && cached && stillFresh) return cached;

  try {
    const remote = await request(PROD_SITE_DATA_URL);
    wx.setStorageSync(CACHE_KEY, remote);
    wx.setStorageSync(CACHE_TIME_KEY, Date.now());
    return remote;
  } catch (error) {
    if (cached) return cached;
    return mockSiteData;
  }
}

module.exports = { fetchSiteData };
