const axios = require("axios");
const rateLimit = require("axios-rate-limit");

//     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
const http = rateLimit(axios.create({headers: {"User-Agent": "IrisBot RotMG Discord Bot"}}), { maxRequests: 1, perMilliseconds: 1000, maxRPS: 1 });

module.exports.getRequest = async (url) => {
    return http.get(url);
};