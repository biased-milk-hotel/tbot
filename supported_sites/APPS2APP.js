const CryptoJS = require("crypto-js");
const axios = require("axios");
const cheerio = require("cheerio");

class APPS2APPS {
  constructor(url) {
    this.formatter = {
      prefix: "",
      stringify: function (t) {
        var r = this.prefix;
        return (r += t.salt.toString()), (r += t.ciphertext.toString());
      },
      parse: function (t) {
        var r = CryptoJS.lib.CipherParams.create({}),
          e = this.prefix.length;
        return 0 !== t.indexOf(this.prefix)
          ? r
          : ((r.ciphertext = CryptoJS.enc.Hex.parse(t.substring(16 + e))),
            (r.salt = CryptoJS.enc.Hex.parse(t.substring(e, 16 + e))),
            r);
      },
    };
    this.url = url;
    this.capture_and_set_encrypted_string();
  }

  capture_and_set_encrypted_string() {
    const arrays = this.url.split(".html#?o=");
    if (arrays.length === 2) {
      this.encrypted_string = arrays[1];
    }
  }

  decrypt_string() {
    const AES = CryptoJS.AES;
    this.decrypted_URL = AES.decrypt(this.encrypted_string, "root", {
      format: this.formatter,
    }).toString(CryptoJS.enc.Utf8);
    return this.decrypted_URL;
  }

  async read_lines() {
    const response = await axios.get(this.decrypted_URL);
    if (!response.data) {
      return undefined;
    }
    const $ = cheerio.load(response.data);
    const data = $("pre").text();
    const title = $("title").text();
    return { data, title };
  }
}

module.exports = APPS2APPS;
