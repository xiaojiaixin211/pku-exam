(function () {
  "use strict";

  /* ============================================================
   *  海南大学考研真题刷题  ——  前端逻辑
   *  - 容错读取 questions.json（兼容 markdown 包裹 / 多段拼接的非法 JSON）
   *  - 历年套卷（全真模拟 / 背题模式）
   *  - 分类刷题（科目 + 题型卡片式筛选）
   *  - 错题本 / 我的收藏（LocalStorage）
   *  - 上传新卷（追加合并到题库）
   * ============================================================ */

  // ---------- LocalStorage 键 ----------
  var LS = {
    wrong: "hndx_wrong_v1",
    fav: "hndx_favorites_v1",
    uploaded: "hndx_uploaded_v1",
  };

  // ---------- 全局状态 ----------
  var state = {
    base: [], // 来自 questions.json 的题目
    uploaded: [], // 用户上传追加的题目（持久化）
    all: [], // 合并去重后的全部题目
    freq: [], // 高频考点
    wrong: new Set(), // 错题 uid
    fav: new Set(), // 收藏 uid
    view: "home",
    catSubject: "all", // 分类刷题 - 当前科目
    catType: "all", // 分类刷题 - 当前题型
    paperYear: null, // 套卷 - 年份
    paperMode: "mock", // mock=全真模拟, recite=背题模式
    paperIndex: 0, // 套卷 - 当前题号
  };

  // ---------- 固定测试账号（密码以 SHA-256 哈希形式存储） ----------
  const validUsers = {
    haida001: {
      passwordHash:
        "690a99440d18d1e8d9b9c93ecf10e0f95eee4a3f17fb80932cf81a29b7cb26b0",
      credits: 10,
    },
    haida002: {
      passwordHash:
        "dc6b5bee777e572eee2e595761460ef69f6bcae4d42064b1c7181cc6af6ac476",
      credits: 10,
    },
    haida003: {
      passwordHash:
        "069626a638eed455b61dbc126eae3e382cffa02fca4cdc4ed99b714783dfe26c",
      credits: 10,
    },
    haida004: {
      passwordHash:
        "63062b5df39c3eb44096cf36bafd6069623c5ecde3ff8a0824ccb6d0df0ccbb0",
      credits: 10,
    },
    haida005: {
      passwordHash:
        "f4cb18a1d8b9a44f5e091d748ccb3078ed32ee422ca123aee56eea175e788200",
      credits: 10,
    },
    haida006: {
      passwordHash:
        "40f320b8b6011e19a23b270b4f6072b79e3efe1036846db82ca3f68cd13d9d40",
      credits: 10,
    },
    haida007: {
      passwordHash:
        "13baf58f1e770231bf5f996143e7480e5c3a2a8cf5d00adb50d7bb9dddc9ec83",
      credits: 10,
    },
    haida008: {
      passwordHash:
        "4ab337cd57cdf7011026eb5ff330490517e03cdde70ecdc9bb90a785e3685d88",
      credits: 10,
    },
    haida009: {
      passwordHash:
        "6b1f4a0783515f00608a23ca036bce3dafa394bca0a6e2b29c36e77cd25064db",
      credits: 10,
    },
    haida010: {
      passwordHash:
        "7343ab9c982e777032ae1d0ee1c58dba30ec9b5390a6f0fb4e1f2143ca054f21",
      credits: 10,
    },
    haida011: {
      passwordHash:
        "748e34d912cceee9a72cffd23841b268cd9da41134ce9c7f96475ddf504cd0bd",
      credits: 10,
    },
    haida012: {
      passwordHash:
        "f5bbe59064ab0beabb73032bdbae7f64bb8d1cd2fcdfab5f6dd00ac850faa458",
      credits: 10,
    },
    haida013: {
      passwordHash:
        "dc8d9e12f4f3eeb8e12065767167559a9c877ca526464195a3ade72de5cebd29",
      credits: 10,
    },
    haida014: {
      passwordHash:
        "f73275b6bf0711cdb5e09ba954755157682125a3b2e6489ca4ce859c12d922b7",
      credits: 10,
    },
    haida015: {
      passwordHash:
        "d31e4c191ef0f4bfedeb41c8d59d25bbf11684d742ca3e95dda7abbf648daaff",
      credits: 10,
    },
    haida016: {
      passwordHash:
        "9084c80b3e9a5e3a147db24e693cf9101ed5c216903ba328adeac2a6893103a8",
      credits: 10,
    },
    haida017: {
      passwordHash:
        "6adfbf42616a7a94a0bb7ed4a3839b1edd373fc9ebf6dc7bea02003a15500f17",
      credits: 10,
    },
    haida018: {
      passwordHash:
        "df9781b4fa03b3fae8392a706d641b477412d93a760ae599df85a2e98608c9ff",
      credits: 10,
    },
    haida019: {
      passwordHash:
        "43db101d459cd6d913b25f6543e87d189156621adcbeb7a59ce34310c4a4548c",
      credits: 10,
    },
    haida020: {
      passwordHash:
        "80da0f4b012a6ca2f10a62357355ba75e59a9c3c1d4e349b5742a96375e592b6",
      credits: 10,
    },
    haida021: {
      passwordHash:
        "a4733ba60e1ef171ea8350f7d9bef2731a6fa8f815dbe4e234723a04c4002a54",
      credits: 10,
    },
    haida022: {
      passwordHash:
        "4261c41130f2d3d5447090f8224c3a0d4833453c90bc383c50b97528e085f3ba",
      credits: 10,
    },
    haida023: {
      passwordHash:
        "015db8ecbd956049643b388f838d60f50be55ef515ddc4012a8b040fa3d7206c",
      credits: 10,
    },
    haida024: {
      passwordHash:
        "2688f1ebd604e1b678123228f00d51ffd05fa4714c6228424e377d77b9e68d30",
      credits: 10,
    },
    haida025: {
      passwordHash:
        "f986d604d985caaa59563a9fd99e87e449e484b3a1b4d72284426b15f7e4fd75",
      credits: 10,
    },
    haida026: {
      passwordHash:
        "a60ba54492de8346f646a0119819911ea41309262b5511d3662cd2432072ff80",
      credits: 10,
    },
    haida027: {
      passwordHash:
        "91f18497e9af4930464f353c2210f2f9b321a8984349b4a503259c7117bd2b9c",
      credits: 10,
    },
    haida028: {
      passwordHash:
        "dd5a77eadb09f9edae319a6d1aef8f77781e0b8b6217e9a3270f1beb8e93b2e7",
      credits: 10,
    },
    haida029: {
      passwordHash:
        "6c3dd22fc90bbeb224b2ea964f7991073c6c691ecf53cd9a41c5e5a23758bc43",
      credits: 10,
    },
    haida030: {
      passwordHash:
        "fb67f102b9002e8cd49f5e77a71c6d8f2880cef421c5d47726ffa45bdf339226",
      credits: 10,
    },
    haida031: {
      passwordHash:
        "187bced82711ea1f0a997d7a98aa9274a8e55bbd6d867444380d8462fa490581",
      credits: 10,
    },
    haida032: {
      passwordHash:
        "adb4e7ac42a74870800196d6a8ace5d8aaf27e0a26f83cd6472165a105ad0be6",
      credits: 10,
    },
    haida033: {
      passwordHash:
        "91c26865a3da81506069b8db766ba008da15757f69fd7354a8d20df32be60bd9",
      credits: 10,
    },
    haida034: {
      passwordHash:
        "fd12780e222bfcf65a5bfb31f28f49e29d8dd36868907f7926bb341065266db6",
      credits: 10,
    },
    haida035: {
      passwordHash:
        "6663b842cda3456b89f0548925300b4d03c6e7e8e266aa9d317c76323d48c40d",
      credits: 10,
    },
    haida036: {
      passwordHash:
        "60e4003ad9d271450d570edc6b36fc6eac1b542c300e59b92b782ebff200840d",
      credits: 10,
    },
    haida037: {
      passwordHash:
        "aeb2d038a753f818c799cd427c1dee26bf023dffe477791849dbf0156e417661",
      credits: 10,
    },
    haida038: {
      passwordHash:
        "71c46abd4e16d16cae1e19f8c7a7caab02de1ec3439f53fdc7d8826068b6a0d8",
      credits: 10,
    },
    haida039: {
      passwordHash:
        "84bb6fb2f11b10ac53c213ac62e4cac5bf1fde217146e72fcb6d26e16b616ed5",
      credits: 10,
    },
    haida040: {
      passwordHash:
        "19a34cbbbce7bc933a63a041d27cfd84fab2f1cc5471fa17225290385733c6d3",
      credits: 10,
    },
    haida041: {
      passwordHash:
        "7ae60676a06a742fe9323207b5fa7c6b5d4f9d72c181963c1625ae15f56f1a56",
      credits: 10,
    },
    haida042: {
      passwordHash:
        "a94bdf780734537e56d003216701d7a8185d9488760264f4c026a0d2ee9e47a0",
      credits: 10,
    },
    haida043: {
      passwordHash:
        "850a111e805abc07a5af9d0c0d3e2b53d4ecd0440db617388cdd29052ae2c2a3",
      credits: 10,
    },
    haida044: {
      passwordHash:
        "ccd0815a168d00e3cea8bdb02123f1a7c3096c4c72c7f955ea6de732a2caec96",
      credits: 10,
    },
    haida045: {
      passwordHash:
        "926bcb0bb17739773bdb35bbacf50242b5e2d2c5be25f21b1befe95adf867ee3",
      credits: 10,
    },
    haida046: {
      passwordHash:
        "a991c01e108ae451b72c324aa43c4cd2697c52f935806fbd318fa6c068bf890b",
      credits: 10,
    },
    haida047: {
      passwordHash:
        "62ce5b09954f94f24839ab498444620d09a6a59978e589324a8bb68f96457811",
      credits: 10,
    },
    haida048: {
      passwordHash:
        "0268fa76e59201c69a04db772768c37b03b9fe11de9358392a7b164054c6f2f6",
      credits: 10,
    },
    haida049: {
      passwordHash:
        "56bf6a01347d42d62ed464d4aa47f7a6148e83a38cefb3ead80971d00166eeda",
      credits: 10,
    },
    haida050: {
      passwordHash:
        "81dba35e7460d9bd76988017711c82cc2b562395acb4da4f17bf3674229ebdb1",
      credits: 10,
    },
    haida051: {
      passwordHash:
        "c37c700fe661f7e04a417b027107df3daee9f07c53b1680c0097f9bf4e1b239a",
      credits: 10,
    },
    haida052: {
      passwordHash:
        "afd668f499dea2cd6e1fa2d3a3c42c9e2a9025b078a5289493d09a9a7620b086",
      credits: 10,
    },
    haida053: {
      passwordHash:
        "4f3e2685e9001406c004e319e33195174683a16250fcab56d66d0a31f6c720ea",
      credits: 10,
    },
    haida054: {
      passwordHash:
        "7064976860eabd1aeae0d727e62b9d452005935ed277e7d6d601d47b4cbc19e0",
      credits: 10,
    },
    haida055: {
      passwordHash:
        "b878c472e12387b7756c76cb33b58e76f4225b533fa9a1a63e4648037905a66d",
      credits: 10,
    },
    haida056: {
      passwordHash:
        "145a3c32a6813b37a3c18b6cbf57479b577dc3bac4960adc3dc6a20db509d394",
      credits: 10,
    },
    haida057: {
      passwordHash:
        "63a6088de3c996b7c4b795e2c6e53a42fc38e6aa64708bb973de7f4c699f7e5b",
      credits: 10,
    },
    haida058: {
      passwordHash:
        "4537a6327cdb8637921d577044f7a656cb907f74cd3c46964fa5f1506bb36df8",
      credits: 10,
    },
    haida059: {
      passwordHash:
        "e4deaa71673dd6e9a94ed24b6ae51af1d7edf90fa7748376a50dcad056811d86",
      credits: 10,
    },
    haida060: {
      passwordHash:
        "1bb0960e638644bbced8c03c74bd4aa9b1f3c6a5d072ea0019214b19701d1256",
      credits: 10,
    },
    haida061: {
      passwordHash:
        "436a68658331476d25bed5c89f47adef892c77013b157b73332e0b0d8bb6f295",
      credits: 10,
    },
    haida062: {
      passwordHash:
        "f2afb3d371146b67a33a10dfa78163d81aa3ecc6a9ce9b67e5fddf1192afef86",
      credits: 10,
    },
    haida063: {
      passwordHash:
        "ca8cd990d89ca9881b89e7f8a0cfa5fb319708820fcd96d443bdbb4e63d88646",
      credits: 10,
    },
    haida064: {
      passwordHash:
        "bacb3b1c1dad2a288585f8603a0fdded694c3460b13da9195f2c3836e61441a1",
      credits: 10,
    },
    haida065: {
      passwordHash:
        "b1085e55b7dbdbed164c62114c999a59b0dc9f5a2cd253b4d0fc418bbdae8d6b",
      credits: 10,
    },
    haida066: {
      passwordHash:
        "887bf439e2840a8a0c5692f987fdd07cf2fc873f67b7a3add298d12f75edb76c",
      credits: 10,
    },
    haida067: {
      passwordHash:
        "7de36512ba3bbed804389e114c81dc1b42ec4d37b0c69c5c590c0e092d0dd578",
      credits: 10,
    },
    haida068: {
      passwordHash:
        "e926f02a8a3bf6d20f72470ac06a3632eedac18f22fae2a49c2db6a18e4e1a5c",
      credits: 10,
    },
    haida069: {
      passwordHash:
        "9954fb3818c938cf4cc9eff2d77b0f59f1e26f11100da794deced118fb52894e",
      credits: 10,
    },
    haida070: {
      passwordHash:
        "96d0980e8eea65434689067995e0f22124620cc3eb4357c867c5d0878f78a0bb",
      credits: 10,
    },
    haida071: {
      passwordHash:
        "5afb2f6341812839b57ebde62ea8f3454731966252a20e7b0ad1adca2fc0eb13",
      credits: 10,
    },
    haida072: {
      passwordHash:
        "20003637ca72c5550ae756e81c15168557c70a3520b4dfda17f10ad31697a789",
      credits: 10,
    },
    haida073: {
      passwordHash:
        "4c10eb74adff5d76c7e748437117a4772b50e15eae23856bc742b037b6286a6e",
      credits: 10,
    },
    haida074: {
      passwordHash:
        "05241ce31c358f3d4ab18b40f75bf99adc860ee5a5697fe51f6819158bb40afa",
      credits: 10,
    },
    haida075: {
      passwordHash:
        "5c018b8280f32ca70d94bb1602b0be32b082105b9268a01c9f43627f72e7e95f",
      credits: 10,
    },
    haida076: {
      passwordHash:
        "401854ed3bd0a8c875cb1562edb389787d14ddb7177e5e2585ef57677402aa0e",
      credits: 10,
    },
    haida077: {
      passwordHash:
        "c39be22d87de448581f34e23e9be5bb12dd342f7146e7b0e0b8beb718aa848f8",
      credits: 10,
    },
    haida078: {
      passwordHash:
        "7511a05aba2b5b5722c8462e523bfe7d403f60f70a05a09d0cde2516cd65893e",
      credits: 10,
    },
    haida079: {
      passwordHash:
        "056e460f552bcebc3cedea544671877f6ce9b7da062d33398ba2056a869896be",
      credits: 10,
    },
    haida080: {
      passwordHash:
        "78e8291e65ef4173111cc91365035d2f9725d9935264172772c65c6ac536033c",
      credits: 10,
    },
    haida081: {
      passwordHash:
        "d943d4ed96edbabc812f59558e683336dc559f42fa8fbddf90486a54ae378f88",
      credits: 10,
    },
    haida082: {
      passwordHash:
        "3c714841ee755a0a0a7cc177f1b6ff0672812b96ee7971643df95960bcabb87f",
      credits: 10,
    },
    haida083: {
      passwordHash:
        "d336bad2ce5ead21e0dfe282c3bc9808a3b0c34346cff429920e02d7041affda",
      credits: 10,
    },
    haida084: {
      passwordHash:
        "011d6b996a75a9567af36536023f82b718b37acf34f7e88f5bf7876fe543cb5e",
      credits: 10,
    },
    haida085: {
      passwordHash:
        "656434066142befa27a125c6a125df992e1a476ea1f07e58dd51c1130f4ee9e8",
      credits: 10,
    },
    haida086: {
      passwordHash:
        "98a11fed160537244bc68d37e5a93a910f3141d50727fe1dddc1e6fc8f24aef9",
      credits: 10,
    },
    haida087: {
      passwordHash:
        "ba68e742a459464aea1ad0dabadedcba6f56adae416a538bc5d610d65c14db86",
      credits: 10,
    },
    haida088: {
      passwordHash:
        "5f4ec7f85a6bb4e3d3cd0503057e6b523134812cec2469a6a891b7448fb63368",
      credits: 10,
    },
    haida089: {
      passwordHash:
        "8070144c273a5a8acece6ff81ae6cac7383d8eee18e720615911cbbbe83bbe13",
      credits: 10,
    },
    haida090: {
      passwordHash:
        "c2e40adfaaf9df0b93421863d5552e013c984a39031e2fb7dd16c3adc41d2034",
      credits: 10,
    },
    haida091: {
      passwordHash:
        "9b18b93f54c4f548d6c5f0fa26c74d860568191bc4bcc6aaa16b6932cf08b3fa",
      credits: 10,
    },
    haida092: {
      passwordHash:
        "45d7369463aa251c95b58fc98fe3960ca717028b6e5a0afcd6784db29a482a42",
      credits: 10,
    },
    haida093: {
      passwordHash:
        "2533c367e175d95ff51815a37704e5563aa958affbac8252b9ded5e0bc40fdb0",
      credits: 10,
    },
    haida094: {
      passwordHash:
        "0ec9ecd3cf4dad5d5b2a91d3e79708e360017f8ff736cd51feb47686c688b545",
      credits: 10,
    },
    haida095: {
      passwordHash:
        "845187dfa4bb13807583a1d663159de5ce9259b90c50bc4a4a0fc669d852086b",
      credits: 10,
    },
    haida096: {
      passwordHash:
        "75aca2fa6997f2dfa9c754386ba33e4d4704ca52f548fe5575e4533bd0d1962e",
      credits: 10,
    },
    haida097: {
      passwordHash:
        "202fa30f9704b4e2961bf931cb58934f4ee5c1cd834eb44f7349817a19eaf25f",
      credits: 10,
    },
    haida098: {
      passwordHash:
        "0f4a47981cf82e4e571ebfafd0493db657cb1de0ab6bc779955270917ecb5cd2",
      credits: 10,
    },
    haida099: {
      passwordHash:
        "675637665fe233d605599feafa03c8bae4432f373ecd380d2c48ec8e6ce75215",
      credits: 10,
    },
    haida100: {
      passwordHash:
        "f461bd96405afd3eab13949f4ab4faf10dcb168d018544f4c58066f2397ec507",
      credits: 10,
    },
  };
  window.validUsers = validUsers;
  // 将所有预置测试账号的初始额度统一设置为 50（替换原先的 10）
  Object.keys(window.validUsers || {}).forEach(function (u) {
    if (window.validUsers[u]) window.validUsers[u].credits = 50;
  });

  /* ACTIVATION CODES REMOVED FOR SECURITY */
  var ACTIVATION_CODES = [];

  // ---------- 工具 ----------
  function $(s, r) {
    return (r || document).querySelector(s);
  }
  function normTitle(t) {
    return String(t == null ? "" : t)
      .replace(/\s+/g, "")
      .toLowerCase();
  }
  function uidOf(q) {
    return (q.year || "") + "_" + normTitle(q.title);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function textToHtml(s) {
    return escapeHtml(s).replace(/\r\n|\r|\n/g, "<br>");
  }
  function starsHtml(n) {
    n = Math.max(0, Math.min(5, Number(n) || 0));
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      t.classList.remove("show");
    }, 2200);
  }

  // ---------- 用户 / 认证 / 额度 工具 ----------
  function sha256Js(message) {
    function utf8Bytes(str) {
      return unescape(encodeURIComponent(str));
    }

    function toWords(bytes) {
      var words = [];
      for (var i = 0; i < bytes.length; i += 4) {
        words.push(
          ((bytes.charCodeAt(i) << 24) |
            ((i + 1 < bytes.length ? bytes.charCodeAt(i + 1) : 0) << 16) |
            ((i + 2 < bytes.length ? bytes.charCodeAt(i + 2) : 0) << 8) |
            (i + 3 < bytes.length ? bytes.charCodeAt(i + 3) : 0)) >>>
            0,
        );
      }
      return words;
    }

    function rotr(x, n) {
      return (x >>> n) | (x << (32 - n));
    }

    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
      0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
      0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
      0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
      0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
      0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    var bytes = utf8Bytes(String(message || ""));
    var bitLen = bytes.length * 8;
    var words = toWords(bytes);
    words.push(0x80 << 24);
    while (words.length % 16 !== 14) words.push(0);
    words.push((bitLen / 0x100000000) >>> 0);
    words.push(bitLen >>> 0);

    var h0 = 0x6a09e667;
    var h1 = 0xbb67ae85;
    var h2 = 0x3c6ef372;
    var h3 = 0xa54ff53a;
    var h4 = 0x510e527f;
    var h5 = 0x9b05688c;
    var h6 = 0x1f83d9ab;
    var h7 = 0x5be0cd19;

    for (var chunk = 0; chunk < words.length; chunk += 16) {
      var w = new Array(64);
      for (var i = 0; i < 16; i++) w[i] = words[chunk + i] >>> 0;
      for (var i = 16; i < 64; i++) {
        var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }

      var a = h0;
      var b = h1;
      var c = h2;
      var d = h3;
      var e = h4;
      var f = h5;
      var g = h6;
      var h = h7;

      for (var i = 0; i < 64; i++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }

    return [h0, h1, h2, h3, h4, h5, h6, h7]
      .map(function (v) {
        return ("00000000" + (v >>> 0).toString(16)).slice(-8);
      })
      .join("");
  }

  async function sha256Hex(text) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder();
        const data = enc.encode(String(text || ""));
        const hash = await window.crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
    } catch (e) {
      // fallback to pure JS implementation below
    }
    return sha256Js(String(text || ""));
  }

  function getCurrentUser() {
    return localStorage.getItem("hndx_current_user") || null;
  }
  function setCurrentUser(username) {
    if (username) localStorage.setItem("hndx_current_user", username);
    else localStorage.removeItem("hndx_current_user");
    updateUserInfoUI();
  }

  function getUserCredits(username) {
    if (!username) return 0;
    var key = "hndx_user_credits_" + username;
    var v = localStorage.getItem(key);
    if (v != null) return Number(v);
    if (
      window.validUsers &&
      window.validUsers[username] &&
      window.validUsers[username].credits != null
    ) {
      var init = Number(window.validUsers[username].credits) || 0;
      localStorage.setItem(key, String(init));
      return init;
    }
    return 0;
  }
  function setUserCredits(username, n) {
    if (!username) return;
    var key = "hndx_user_credits_" + username;
    localStorage.setItem(key, String(Number(n) || 0));
    updateUserInfoUI();
  }

  // ---------- 会员状态工具 ----------
  function isUserPermanent(username) {
    if (!username) return false;
    return localStorage.getItem("hndx_user_perm_" + username) === "1";
  }
  function getUserVipExpiry(username) {
    if (!username) return 0;
    return Number(localStorage.getItem("hndx_user_vip_" + username) || 0);
  }
  function isUserVipValid(username) {
    if (!username) return false;
    if (isUserPermanent(username)) return true;
    var exp = getUserVipExpiry(username);
    return Number(exp) > Date.now();
  }

  function updateUserInfoUI() {
    var nameEl = $("#user-name");
    var creditsEl = $("#user-credits");
    var btn = $("#login-open-btn");
    var user = getCurrentUser();
    if (user) {
      var credits = getUserCredits(user);
      // 在 Header 中以更显眼的格式展示账号与额度： [账号: haida00X | 剩余额度: 50]
      if (creditsEl) {
        creditsEl.style.display = "inline-block";
        var memberText = "";
        if (isUserPermanent(user)) {
          memberText = " | 会员: 永久";
        } else if (isUserVipValid(user)) {
          var exp = getUserVipExpiry(user);
          var days = Math.max(
            0,
            Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24)),
          );
          memberText = " | 会员: 月卡(" + days + " 天)";
        }
        creditsEl.textContent =
          "[账号: " + user + " | 剩余额度: " + credits + "]" + memberText;
      }
      // 在会员弹窗内显示详细会员状态（如果弹窗存在）
      var ms = $("#member-status");
      if (ms) {
        if (isUserPermanent(user)) {
          ms.textContent = user + "（永久会员）";
        } else if (isUserVipValid(user)) {
          var exp = getUserVipExpiry(user);
          var d = new Date(exp);
          ms.textContent = user + "（月卡， 到期: " + d.toLocaleString() + "）";
        } else {
          ms.textContent = user + "（非会员）";
        }
      }
      // 隐藏旧的单独用户名展示（避免重复）
      if (nameEl) nameEl.style.display = "none";
      if (btn) btn.textContent = "账户管理";
    } else {
      if (nameEl) nameEl.style.display = "none";
      if (creditsEl) creditsEl.style.display = "none";
      if (btn) btn.textContent = "登录 / 注册";
      var ms = $("#member-status");
      if (ms) ms.textContent = "未登录";
    }
  }

  function initUserCredits() {
    // 不预分配所有账号 credits，避免大规模写入 localStorage；使用时按需初始化
  }

  function attachLoginHandlers() {
    var openBtn = $("#login-open-btn");
    var modal = $("#login-modal");
    var submitBtn = $("#login-submit");
    var logoutBtn = $("#login-logout");
    var accountInput = $("#login-account");
    var pwdInput = $("#login-password");

    // Inline (visible) login controls
    var inlineAccount = $("#login-inline-account");
    var inlinePwd = $("#login-inline-password");
    var inlineSubmit = $("#login-inline-submit");

    if (openBtn && modal) {
      openBtn.addEventListener("click", function () {
        modal.style.display = "flex";
        var user = getCurrentUser();
        if (user && accountInput) accountInput.value = user;
        updateLoginModalButtons();
      });
    }

    function updateLoginModalButtons() {
      var user = getCurrentUser();
      if (user) {
        if (logoutBtn) logoutBtn.style.display = "inline-block";
        if (submitBtn) submitBtn.style.display = "none";
        // reflect inline inputs (optional)
        if (inlineAccount) inlineAccount.style.display = "none";
        if (inlinePwd) inlinePwd.style.display = "none";
        if (inlineSubmit) inlineSubmit.style.display = "none";
      } else {
        if (logoutBtn) logoutBtn.style.display = "none";
        if (submitBtn) submitBtn.style.display = "inline-block";
        if (inlineAccount) inlineAccount.style.display = "inline-block";
        if (inlinePwd) inlinePwd.style.display = "inline-block";
        if (inlineSubmit) inlineSubmit.style.display = "inline-block";
      }
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", async function () {
        var acc = accountInput ? accountInput.value.trim() : "";
        var pwd = pwdInput ? pwdInput.value : "";
        if (!acc || !pwd) {
          alert("请填写账号与密码");
          return;
        }
        var hashed = await sha256Hex(pwd);
        if (
          window.validUsers &&
          window.validUsers[acc] &&
          window.validUsers[acc].passwordHash === hashed
        ) {
          setCurrentUser(acc);
          getUserCredits(acc);
          alert("登录成功");
          if (modal) modal.style.display = "none";
          toast("登录成功：" + acc);
        } else {
          alert("账号或密码错误");
        }
        updateLoginModalButtons();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        setCurrentUser(null);
        alert("已注销");
        toast("已注销");
        updateLoginModalButtons();
        var modalEl = $("#login-modal");
        if (modalEl) modalEl.style.display = "none";
      });
    }

    // Wire inline visible login: copy values into modal inputs and reuse submit handler
    if (inlineSubmit) {
      inlineSubmit.addEventListener("click", function () {
        var acc = inlineAccount ? inlineAccount.value.trim() : "";
        var pwd = inlinePwd ? inlinePwd.value : "";
        if (!acc || !pwd) {
          alert("请填写账号与密码");
          return;
        }
        if (accountInput) accountInput.value = acc;
        if (pwdInput) pwdInput.value = pwd;
        // trigger the modal submit handler (if present)
        if (submitBtn) submitBtn.click();
      });
    }

    window.updateLoginModalButtons = updateLoginModalButtons;
  }

  // ---------- 存储 ----------
  function loadSet(key) {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch (e) {
      return new Set();
    }
  }
  function saveSet(key, set) {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  }
  function loadUploaded() {
    try {
      return JSON.parse(localStorage.getItem(LS.uploaded) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveUploaded(arr) {
    localStorage.setItem(LS.uploaded, JSON.stringify(arr));
  }

  /* ============================================================
   *  容错 JSON 解析
   *  从文本中提取所有平衡的 {...} 对象（支持嵌套与多段拼接的非法 JSON）。
   *  这样即便 questions.json 被 markdown 围栏包裹、或多段 JSON 拼接，
   *  也能正确抽取出每道题。
   * ============================================================ */
  function extractObjects(text) {
    var out = [];
    var n = text.length;

    function findClose(openIdx) {
      var depth = 0,
        inStr = false,
        esc = false;
      for (var j = openIdx; j < n; j++) {
        var c = text[j];
        if (inStr) {
          if (esc) esc = false;
          else if (c === "\\") esc = true;
          else if (c === '"') inStr = false;
          continue;
        }
        if (c === '"') {
          inStr = true;
          continue;
        }
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) return j;
        }
      }
      return -1;
    }

    function scan(start, end) {
      var i = start;
      while (i < end) {
        var c = text[i];
        if (c === '"') {
          // 跳过字符串
          var j = i + 1,
            esc = false;
          while (j < end) {
            var cc = text[j];
            if (esc) esc = false;
            else if (cc === "\\") esc = true;
            else if (cc === '"') {
              j++;
              break;
            }
            j++;
          }
          i = j;
          continue;
        }
        if (c === "{") {
          var close = findClose(i);
          if (close === -1) {
            i++;
            continue;
          }
          var slice = text.slice(i, close + 1);
          try {
            out.push(JSON.parse(slice));
          } catch (e) {}
          scan(i + 1, close); // 递归查找嵌套对象
          i = close + 1;
          continue;
        }
        i++;
      }
    }

    scan(0, n);
    return out;
  }

  function normalizeQuestion(q) {
    var title = String(q.title || "").trim();
    return {
      uid: uidOf({ year: q.year, title: title }),
      id: q.id,
      year: Number(q.year) || 0,
      subject: String(q.subject || "").trim() || "未分类",
      question_type: String(q.question_type || "").trim() || "其他",
      title: title,
      analysis: String(q.analysis || "").trim(),
      frequency_star: Number(q.frequency_star) || 0,
      tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
    };
  }

  // 从任意文本（含 markdown 包裹、多段拼接）解析题目与高频考点
  function parseLibrary(raw) {
    var text = String(raw || "").replace(/```[a-zA-Z]*/g, ""); // 去除 markdown 代码围栏
    var objs = extractObjects(text);
    var qMap = {};
    var freq = [];
    for (var k = 0; k < objs.length; k++) {
      var o = objs[k];
      if (!o || typeof o !== "object" || Array.isArray(o)) continue;
      if (o.title && (o.subject || o.question_type)) {
        var q = normalizeQuestion(o);
        if (q.title) qMap[q.uid] = q; // 同 uid 去重
      } else if (
        o.knowledge_point &&
        (o.count_estimate != null || o.frequency_star != null)
      ) {
        freq.push({
          knowledge_point: String(o.knowledge_point || ""),
          count_estimate: Number(o.count_estimate) || 0,
          frequency_star: Number(o.frequency_star) || 0,
          related_years: Array.isArray(o.related_years) ? o.related_years : [],
          subjects: Array.isArray(o.subjects) ? o.subjects : [],
        });
      }
    }
    var questions = [];
    for (var u in qMap) questions.push(qMap[u]);
    return { questions: questions, freq: freq };
  }

  function mergeLibrary() {
    var map = {};
    state.base.forEach(function (q) {
      map[q.uid] = q;
    });
    state.uploaded.forEach(function (q) {
      map[q.uid] = q;
    }); // 上传覆盖同 uid
    state.all = Object.keys(map).map(function (u) {
      return map[u];
    });
    state.all.sort(function (a, b) {
      return (
        b.year - a.year ||
        a.subject.localeCompare(b.subject, "zh") ||
        a.question_type.localeCompare(b.question_type, "zh")
      );
    });
  }

  // ---------- 派生数据 ----------
  function years() {
    var s = {};
    state.all.forEach(function (q) {
      if (q.year) s[q.year] = 1;
    });
    return Object.keys(s)
      .map(Number)
      .sort(function (a, b) {
        return b - a;
      });
  }
  function subjects() {
    var order = [
      "古代文学",
      "现代文学",
      "外国文学",
      "古代文论",
      "西方文论",
      "现代汉语",
      "古代汉语",
      "文学理论",
      "比较文学",
    ];
    var set = {};
    state.all.forEach(function (q) {
      set[q.subject] = 1;
    });
    var list = order.filter(function (s) {
      return set[s];
    });
    Object.keys(set).forEach(function (s) {
      if (list.indexOf(s) === -1) list.push(s);
    });
    return list;
  }
  function types() {
    var order = ["名词解释", "简答题", "论述题", "填空题", "判断题"];
    var set = {};
    state.all.forEach(function (q) {
      set[q.question_type] = 1;
    });
    var list = order.filter(function (s) {
      return set[s];
    });
    Object.keys(set).forEach(function (s) {
      if (list.indexOf(s) === -1) list.push(s);
    });
    return list;
  }
  function countBy(fn) {
    var m = {};
    state.all.forEach(function (q) {
      var k = fn(q);
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }

  // ---------- 题目卡片渲染 ----------
  // ---------- 题目卡片渲染 ----------
  function cardHtml(q, showAnswer) {
    var inWrong = state.wrong.has(q.uid);
    var inFav = state.fav.has(q.uid);
    var tagsHtml = q.tags.length
      ? '<div class="q-tags">' +
        q.tags
          .map(function (t) {
            return '<span class="tag">' + escapeHtml(t) + "</span>";
          })
          .join("") +
        "</div>"
      : "";
    var freqHtml =
      q.frequency_star > 0
        ? '<span class="freq" title="考频">' +
          starsHtml(q.frequency_star) +
          "</span>"
        : "";
    return (
      "" +
      '<div class="q-card" data-uid="' +
      escapeHtml(q.uid) +
      '">' +
      '<div class="q-meta">' +
      '<span class="badge badge-year">' +
      escapeHtml(q.year || "—") +
      "</span>" +
      '<span class="badge badge-subject">' +
      escapeHtml(q.subject) +
      "</span>" +
      '<span class="badge badge-type">' +
      escapeHtml(q.question_type) +
      "</span>" +
      freqHtml +
      "</div>" +
      '<div class="q-title">' +
      escapeHtml(q.title) +
      "</div>" +
      '<div class="q-analysis' +
      (showAnswer ? " show" : "") +
      '">' +
      '<div class="q-analysis-label">参考解析</div>' +
      '<div class="q-analysis-body">' +
      textToHtml(q.analysis || "暂无解析") +
      "</div>" +
      "</div>" +
      tagsHtml +
      '<div class="q-actions">' +
      '<button class="btn btn-ghost" data-action="toggle-answer">' +
      (showAnswer ? "隐藏答案" : "显示答案") +
      "</button>" +
      '<button class="btn ' +
      (inWrong ? "btn-wrong-active" : "btn-wrong") +
      '" data-action="toggle-wrong">' +
      (inWrong ? "✓ 已标记错题" : "标记错题") +
      "</button>" +
      '<button class="btn ' +
      (inFav ? "btn-fav-active" : "btn-fav") +
      '" data-action="toggle-fav">' +
      (inFav ? "⭐ 已收藏" : "⭐ 收藏") +
      "</button>" +
      "</div>" +
      // ====== 新增：AI 批改输入与结果区域 ======
      '<div class="ai-grade-container" style="margin-top: 15px; border-top: 1px dashed #e0e0e0; padding-top: 10px;">' +
      '  <label style="font-weight: bold; display: block; margin-bottom: 6px; color: #333;">✍️ 你的作答 / 答题思路：</label>' +
      '  <textarea class="card-answer-input" rows="4" placeholder="在此输入你的回答或解题思路..." style="width: 100%; border: 1px solid #ccc; border-radius: 6px; padding: 10px; font-size: 14px; box-sizing: border-box;"></textarea>' +
      '  <button class="btn btn-primary card-grade-btn" data-action="card-ai-grade" style="margin-top: 8px; background: #0056b3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">🤖 AI 智能批改打分</button>' +
      '  <div class="ai-result-box card-ai-result" style="display: none; margin-top: 12px; background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #0056b3;"></div>' +
      "</div>" +
      // =====================================
      "</div>"
    );
  }

  // ---------- 视图：总调度 ----------
  function render() {
    var views = document.querySelectorAll(".view");
    for (var i = 0; i < views.length; i++) views[i].classList.remove("active");
    $("#view-" + state.view).classList.add("active");

    var navs = document.querySelectorAll(".nav a");
    for (var j = 0; j < navs.length; j++)
      navs[j].classList.toggle("active", navs[j].dataset.target === state.view);
    $(".nav").classList.remove("open");

    updateBadges();
    switch (state.view) {
      case "home":
        renderHome();
        break;
      case "papers":
        renderPapers();
        break;
      case "category":
        renderCategory();
        break;
      case "wrong":
        renderList("wrong", state.wrong);
        break;
      case "favorites":
        renderList("favorites", state.fav);
        break;
      case "upload":
        var lc = $("#lib-count");
        if (lc) lc.textContent = state.all.length;
        break;
    }
    window.scrollTo(0, 0);
  }

  function updateBadges() {
    var w = $("#nav-wrong-badge");
    if (w) w.textContent = state.wrong.size || "";
    var f = $("#nav-fav-badge");
    if (f) f.textContent = state.fav.size || "";
  }

  // ---------- 视图：首页 ----------
  function renderHome() {
    var ys = years(),
      ss = subjects();
    var subjCount = countBy(function (q) {
      return q.subject;
    });
    var yearCount = countBy(function (q) {
      return q.year;
    });

    var html =
      '<div class="hero">' +
      "<h1>海南大学考研真题刷题</h1>" +
      '<p class="hero-sub">中国语言文学 · 历年真题智能刷题平台</p>' +
      '<div class="stat-row">' +
      '<div class="stat"><div class="stat-num">' +
      state.all.length +
      '</div><div class="stat-label">题目总数</div></div>' +
      '<div class="stat"><div class="stat-num">' +
      ys.length +
      '</div><div class="stat-label">历年套卷</div></div>' +
      '<div class="stat"><div class="stat-num">' +
      ss.length +
      '</div><div class="stat-label">科目</div></div>' +
      '<div class="stat"><div class="stat-num">' +
      state.wrong.size +
      '</div><div class="stat-label">我的错题</div></div>' +
      "</div></div>";

    html +=
      '<div class="quick-actions">' +
      '<button class="qa" data-go="papers">历年套卷</button>' +
      '<button class="qa" data-go="category">分类刷题</button>' +
      '<button class="qa" data-go="wrong">错题本</button>' +
      '<button class="qa" data-go="favorites">我的收藏</button>' +
      '<button class="qa" data-go="upload">上传新卷</button>' +
      "</div>";

    html +=
      '<div class="panel"><h2 class="panel-title">历年套卷</h2><div class="year-grid">';
    for (var i = 0; i < ys.length; i++) {
      html +=
        '<button class="year-card" data-go-year="' +
        ys[i] +
        '"><span class="yc-num">' +
        ys[i] +
        '</span><span class="yc-cnt">' +
        (yearCount[ys[i]] || 0) +
        " 题</span></button>";
    }
    html += "</div></div>";

    html +=
      '<div class="panel"><h2 class="panel-title">科目分布</h2><div class="subj-grid">';
    for (var s = 0; s < ss.length; s++) {
      html +=
        '<button class="subj-card" data-go-subject="' +
        escapeHtml(ss[s]) +
        '"><span class="sc-name">' +
        escapeHtml(ss[s]) +
        '</span><span class="sc-cnt">' +
        (subjCount[ss[s]] || 0) +
        "</span></button>";
    }
    html += "</div></div>";

    if (state.freq.length) {
      html +=
        '<div class="panel"><h2 class="panel-title">高频考点榜</h2><div class="freq-list">';
      var top = state.freq.slice(0, 10);
      for (var f = 0; f < top.length; f++) {
        var it = top[f];
        html +=
          '<div class="freq-item">' +
          '<span class="freq-rank">' +
          (f + 1) +
          "</span>" +
          '<div class="freq-main">' +
          '<div class="freq-kp">' +
          escapeHtml(it.knowledge_point) +
          "</div>" +
          '<div class="freq-sub">' +
          escapeHtml((it.subjects || []).join(" / ")) +
          " · 近年出现 " +
          it.count_estimate +
          " 次</div>" +
          "</div>" +
          '<span class="freq-star">' +
          starsHtml(it.frequency_star) +
          "</span>" +
          "</div>";
      }
      html += "</div></div>";
    }
    $("#view-home").innerHTML = html;
  }

  // ---------- 视图：历年套卷 ----------
  function renderPapers() {
    var ys = years();
    if (!state.paperYear && ys.length) state.paperYear = ys[0];

    var html =
      '<div class="panel paper-controls">' +
      '<div class="ctrl-row"><label>年份：</label><select id="paper-year">';
    for (var i = 0; i < ys.length; i++) {
      html +=
        '<option value="' +
        ys[i] +
        '"' +
        (ys[i] === state.paperYear ? " selected" : "") +
        ">" +
        ys[i] +
        " 年</option>";
    }
    html += "</select></div>";
    html +=
      '<div class="ctrl-row mode-toggle">' +
      '<button class="mode-btn ' +
      (state.paperMode === "mock" ? "active" : "") +
      '" data-mode="mock">全真模拟</button>' +
      '<button class="mode-btn ' +
      (state.paperMode === "recite" ? "active" : "") +
      '" data-mode="recite">背题模式</button>' +
      "</div></div>";

    var list = state.all.filter(function (q) {
      return q.year === state.paperYear;
    });
    window.currentPaperList = list;
    if (!list.length) {
      html += '<div class="empty">该年份暂无题目</div>';
      $("#view-papers").innerHTML = html;
      return;
    }
    if (state.paperIndex >= list.length) state.paperIndex = 0;
    var q = list[state.paperIndex];
    var showAnswer = state.paperMode === "recite";
    var pct = (((state.paperIndex + 1) / list.length) * 100).toFixed(1);

    html +=
      '<div class="paper-progress">' +
      '<div class="pp-bar"><div class="pp-fill" style="width:' +
      pct +
      '%"></div></div>' +
      '<div class="pp-text">第 ' +
      (state.paperIndex + 1) +
      " / " +
      list.length +
      " 题 · " +
      (state.paperMode === "mock"
        ? "全真模拟（答案默认隐藏）"
        : "背题模式（答案默认展示，可随时折叠）") +
      "</div>" +
      "</div>";

    html += '<div class="card-wrap">' + cardHtml(q, showAnswer) + "</div>";
    html +=
      '<div class="ai-grade-container" style="margin-top: 15px; border-top: 1px dashed #e0e0e0; padding-top: 10px;">';
    html +=
      '  <label style="font-weight: bold; display: block; margin-bottom: 6px; color: #333;">✍️ 你的作答 / 答题思路：</label>';
    html +=
      '  <textarea id="answer-input-' +
      state.paperIndex +
      '" rows="4" placeholder="在此输入你的回答或解题思路..." style="width: 100%; border: 1px solid #ccc; border-radius: 6px; padding: 10px; font-size: 14px; box-sizing: border-box;"></textarea>';
    html +=
      '  <button onclick="submitForAIGrade(' +
      state.paperIndex +
      ')" id="btn-submit-' +
      state.paperIndex +
      '" style="margin-top: 8px; background: #0056b3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">🤖 AI 智能批改打分</button>';
    html +=
      '  <div id="ai-result-' +
      state.paperIndex +
      '" class="ai-result-box" style="display: none; margin-top: 12px; background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #0056b3;"></div>';
    html += "</div>";
    html +=
      '<div class="paper-nav">' +
      '<button class="btn btn-primary" data-act="prev" ' +
      (state.paperIndex <= 0 ? "disabled" : "") +
      ">上一题</button>" +
      '<button class="btn btn-primary" data-act="next" ' +
      (state.paperIndex >= list.length - 1 ? "disabled" : "") +
      ">下一题</button>" +
      "</div>";

    html +=
      '<details class="answer-card"><summary>答题卡 / 跳转</summary><div class="ac-grid">';
    for (var m = 0; m < list.length; m++) {
      var marked = state.wrong.has(list[m].uid) || state.fav.has(list[m].uid);
      html +=
        '<button class="ac-cell' +
        (m === state.paperIndex ? " cur" : "") +
        (marked ? " marked" : "") +
        '" data-act="jump" data-i="' +
        m +
        '">' +
        (m + 1) +
        "</button>";
    }
    html += "</div></details>";

    $("#view-papers").innerHTML = html;
  }

  // ---------- 视图：分类刷题 ----------
  function renderCategory() {
    var ss = subjects(),
      ts = types();
    var subjCount = countBy(function (q) {
      return q.subject;
    });

    var html =
      '<div class="panel"><h2 class="panel-title">选择科目</h2><div class="subj-grid">';
    html +=
      '<button class="subj-card' +
      (state.catSubject === "all" ? " active" : "") +
      '" data-filter-subject="all"><span class="sc-name">全部</span><span class="sc-cnt">' +
      state.all.length +
      "</span></button>";
    for (var i = 0; i < ss.length; i++) {
      html +=
        '<button class="subj-card' +
        (state.catSubject === ss[i] ? " active" : "") +
        '" data-filter-subject="' +
        escapeHtml(ss[i]) +
        '"><span class="sc-name">' +
        escapeHtml(ss[i]) +
        '</span><span class="sc-cnt">' +
        (subjCount[ss[i]] || 0) +
        "</span></button>";
    }
    html += "</div></div>";

    html +=
      '<div class="panel"><h2 class="panel-title">选择题型</h2><div class="type-chips">';
    html +=
      '<button class="type-chip' +
      (state.catType === "all" ? " active" : "") +
      '" data-filter-type="all">全部</button>';
    for (var t = 0; t < ts.length; t++) {
      html +=
        '<button class="type-chip' +
        (state.catType === ts[t] ? " active" : "") +
        '" data-filter-type="' +
        escapeHtml(ts[t]) +
        '">' +
        escapeHtml(ts[t]) +
        "</button>";
    }
    html += "</div></div>";

    var list = state.all.filter(function (q) {
      return (
        (state.catSubject === "all" || q.subject === state.catSubject) &&
        (state.catType === "all" || q.question_type === state.catType)
      );
    });
    list.sort(function (a, b) {
      return b.year - a.year || a.subject.localeCompare(b.subject, "zh");
    });

    html +=
      '<div class="panel"><div class="result-head">共 <b>' +
      list.length +
      '</b> 题</div><div class="card-list">';
    if (!list.length) {
      html += '<div class="empty">没有符合条件的题目</div>';
    } else {
      for (var k = 0; k < list.length; k++) html += cardHtml(list[k], false);
    }
    html += "</div></div>";
    $("#view-category").innerHTML = html;
  }

  // ---------- 视图：错题本 / 我的收藏 ----------
  function renderList(viewName, set) {
    var list = state.all.filter(function (q) {
      return set.has(q.uid);
    });
    list.sort(function (a, b) {
      return b.year - a.year;
    });
    var title = viewName === "wrong" ? "错题本" : "我的收藏";
    var emptyMsg =
      viewName === "wrong"
        ? "还没有标记错题，刷题时点击“标记错题”即可加入。"
        : "还没有收藏题目，刷题时点击“⭐ 收藏”即可加入。";
    var html =
      '<div class="panel"><div class="result-head">' +
      title +
      " · 共 <b>" +
      list.length +
      '</b> 题</div><div class="card-list">';
    if (!list.length) html += '<div class="empty">' + emptyMsg + "</div>";
    else for (var i = 0; i < list.length; i++) html += cardHtml(list[i], false);
    html += "</div></div>";
    $("#view-" + viewName).innerHTML = html;
  }

  // ---------- 卡片操作 ----------
  function handleCardAction(btn) {
    var card = btn.closest(".q-card");
    if (!card) return;
    var uid = card.dataset.uid;
    var q = null;
    for (var i = 0; i < state.all.length; i++) {
      if (state.all[i].uid === uid) {
        q = state.all[i];
        break;
      }
    }
    if (!q) return;

    var act = btn.dataset.action;
    if (act === "toggle-answer") {
      var an = $(".q-analysis", card);
      var on = an.classList.toggle("show");
      btn.textContent = on ? "隐藏答案" : "显示答案";
    } else if (act === "toggle-wrong") {
      if (state.wrong.has(uid)) {
        state.wrong.delete(uid);
        toast("已移出错题本");
      } else {
        state.wrong.add(uid);
        toast("已加入错题本");
      }
      saveSet(LS.wrong, state.wrong);
      reflectCard(card, uid);
      if (state.view === "wrong") removeCard(card);
      updateBadges();
    } else if (act === "toggle-fav") {
      if (state.fav.has(uid)) {
        state.fav.delete(uid);
        toast("已取消收藏");
      } else {
        state.fav.add(uid);
        toast("已收藏");
      }
      saveSet(LS.fav, state.fav);
      reflectCard(card, uid);
      if (state.view === "favorites") removeCard(card);
      updateBadges();
    }
  }

  function reflectCard(card, uid) {
    var wb = $('[data-action="toggle-wrong"]', card);
    var fb = $('[data-action="toggle-fav"]', card);
    if (wb) {
      var onW = state.wrong.has(uid);
      wb.className = "btn " + (onW ? "btn-wrong-active" : "btn-wrong");
      wb.textContent = onW ? "✓ 已标记错题" : "标记错题";
    }
    if (fb) {
      var onF = state.fav.has(uid);
      fb.className = "btn " + (onF ? "btn-fav-active" : "btn-fav");
      fb.textContent = onF ? "⭐ 已收藏" : "⭐ 收藏";
    }
  }

  function removeCard(card) {
    card.style.transition = "opacity .25s, transform .25s";
    card.style.opacity = "0";
    card.style.transform = "translateY(-6px)";
    setTimeout(function () {
      card.remove();
      var list = $("#view-" + state.view + " .card-list");
      if (list && !list.children.length) render();
    }, 250);
  }

  // ---------- 套卷翻页 ----------
  function handlePaperNav(btn) {
    var list = state.all.filter(function (q) {
      return q.year === state.paperYear;
    });
    var act = btn.dataset.act;
    if (act === "prev" && state.paperIndex > 0) {
      state.paperIndex--;
      renderPapers();
    } else if (act === "next" && state.paperIndex < list.length - 1) {
      state.paperIndex++;
      renderPapers();
    } else if (act === "jump") {
      state.paperIndex = Number(btn.dataset.i);
      renderPapers();
    }
  }

  // ---------- 上传新卷 ----------
  function handleFiles(files) {
    if (!files || !files.length) return;
    var pending = files.length;
    var collected = [];
    Array.prototype.forEach.call(files, function (file) {
      if (!/\.json$/i.test(file.name) && file.type !== "application/json") {
        toast("仅支持 .json 文件：" + file.name);
        if (--pending === 0) finishUpload(collected);
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var r = parseLibrary(reader.result);
          if (!r.questions.length) toast("未在 " + file.name + " 中识别到题目");
          else {
            collected = collected.concat(r.questions);
            toast("已从 " + file.name + " 识别 " + r.questions.length + " 题");
          }
        } catch (err) {
          toast("解析失败：" + file.name);
        }
        if (--pending === 0) finishUpload(collected);
      };
      reader.onerror = function () {
        toast("读取失败：" + file.name);
        if (--pending === 0) finishUpload(collected);
      };
      reader.readAsText(file);
    });
  }

  function finishUpload(collected) {
    if (!collected.length) return;
    var before = state.all.length;
    var map = {};
    state.uploaded.forEach(function (q) {
      map[q.uid] = q;
    });
    collected.forEach(function (q) {
      map[q.uid] = q;
    });
    state.uploaded = Object.keys(map).map(function (u) {
      return map[u];
    });
    saveUploaded(state.uploaded);
    mergeLibrary();
    var added = state.all.length - before;
    $("#upload-status").innerHTML =
      '<div class="ok-box">本次共识别 <b>' +
      collected.length +
      "</b> 题，新增 <b>" +
      added +
      "</b> 题，当前题库共 <b>" +
      state.all.length +
      "</b> 题。已保存到本地，刷新后仍有效。</div>";
    var lc = $("#lib-count");
    if (lc) lc.textContent = state.all.length;
    toast("题库已更新，共 " + state.all.length + " 题");
    if (state.view === "home" || state.view === "category") render();
  }

  // ---------- 手动加载基础题库（file:// 兜底） ----------
  function loadBaseFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var r = parseLibrary(reader.result);
      state.base = r.questions;
      state.freq = r.freq;
      mergeLibrary();
      $("#load-banner").classList.add("hidden");
      toast("已加载题库：" + state.all.length + " 题");
      render();
    };
    reader.readAsText(file);
  }

  // ---------- 事件绑定 ----------
  function bindEvents() {
    // 拖拽上传
    var drop = $("#drop-zone");
    var input = $("#file-input");
    if (input)
      input.addEventListener("change", function () {
        handleFiles(input.files);
        input.value = "";
      });
    if (drop) {
      ["dragover", "dragenter"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          drop.classList.add("drag");
        });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          drop.classList.remove("drag");
        });
      });
      drop.addEventListener("drop", function (e) {
        if (e.dataTransfer && e.dataTransfer.files)
          handleFiles(e.dataTransfer.files);
      });
    }

    // 统一 click 委托
    // 统一 click 委托
    document.addEventListener("click", function (e) {
      var t = e.target; // 变量 t 在最顶部定义一次

      // 1. 优先检查卡片操作（包括 AI 批改、显示答案、错题、收藏）
      var actBtn = t.closest("[data-action]");
      if (actBtn) {
        var action = actBtn.dataset.action;
        if (action === "card-ai-grade") {
          handleCardAIGrade(actBtn);
          return;
        }
        handleCardAction(actBtn);
        return;
      }

      // 2. 侧边栏与页面导航
      if (t.closest(".nav-toggle")) {
        $(".nav").classList.toggle("open");
        return;
      }
      var navA = t.closest(".nav a");
      if (navA) {
        state.view = navA.dataset.target;
        render();
        return;
      }

      var go = t.closest("[data-go]");
      if (go) {
        state.view = go.dataset.go;
        render();
        return;
      }
      var gy = t.closest("[data-go-year]");
      if (gy) {
        state.view = "papers";
        state.paperYear = Number(gy.dataset.goYear);
        state.paperIndex = 0;
        render();
        return;
      }
      var gs = t.closest("[data-go-subject]");
      if (gs) {
        state.view = "category";
        state.catSubject = gs.dataset.goSubject;
        state.catType = "all";
        render();
        return;
      }

      // 3. 套卷模式与翻页
      var mb = t.closest("[data-mode]");
      if (mb) {
        state.paperMode = mb.dataset.mode;
        renderPapers();
        return;
      }
      var pa = t.closest("[data-act]");
      if (pa) {
        handlePaperNav(pa);
        return;
      }

      // 4. 分类刷题筛选
      var fs = t.closest("[data-filter-subject]");
      if (fs) {
        state.catSubject = fs.dataset.filterSubject;
        renderCategory();
        return;
      }
      var ft = t.closest("[data-filter-type]");
      if (ft) {
        state.catType = ft.dataset.filterType;
        renderCategory();
        return;
      }
    });

    // 统一 change 委托
    document.addEventListener("change", function (e) {
      if (e.target.id === "paper-year") {
        state.paperYear = Number(e.target.value);
        state.paperIndex = 0;
        renderPapers();
        return;
      }
      if (e.target.id === "base-file-input") {
        loadBaseFile(e.target.files && e.target.files[0]);
        return;
      }
    });
  }
  // ---------- 加载失败提示 ----------
  function showLoadBanner() {
    var b = $("#load-banner");
    if (!b) return;
    b.classList.remove("hidden");
    b.innerHTML =
      "<div><b>未自动读取到 questions.json。</b>" +
      "<p>若直接双击打开本页面（file:// 协议），浏览器会拦截本地文件读取。请任选一种方式：</p>" +
      '<p class="banner-opt">1) 启动本地静态服务器后访问，例如在当前目录运行 <code>python -m http.server</code> 后打开 <code>http://localhost:8000/</code></p>' +
      '<p class="banner-opt">2) 手动选择题库文件加载：<input type="file" id="base-file-input" accept=".json,application/json"></p>' +
      "</div>";
  }

  // ---------- 初始化 ----------
  function init() {
    state.wrong = loadSet(LS.wrong);
    state.fav = loadSet(LS.fav);
    state.uploaded = loadUploaded();
    bindEvents();
    // 在初始化时确保生成/加载测试账号（存放于 localStorage，不会写入仓库源代码）
    // ensureValidUsers removed: using hard-coded validUsers with password hashes
    window.validUsers = window.validUsers || validUsers;
    // 初始化用户额度与登录控件
    try {
      initUserCredits();
      attachLoginHandlers();
      updateUserInfoUI();
    } catch (e) {
      console.warn("登录初始化失败", e);
    }

    fetch("questions.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (raw) {
        var r = parseLibrary(raw);
        state.base = r.questions;
        state.freq = r.freq;
        mergeLibrary();
        $("#loading").classList.add("hidden");
        if (!state.base.length) showLoadBanner();
        render();
      })
      .catch(function () {
        state.base = [];
        state.freq = [];
        mergeLibrary();
        $("#loading")?.classList.add("hidden");
        showLoadBanner();
        render();
      });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();

  async function submitForAIGrade(qIndex) {
    var question =
      window.currentPaperList && window.currentPaperList[qIndex]
        ? window.currentPaperList[qIndex]
        : null;

    var inputEl = document.getElementById("answer-input-" + qIndex);
    var resultBox = document.getElementById("ai-result-" + qIndex);
    var submitBtn = document.getElementById("btn-submit-" + qIndex);

    if (!inputEl || !inputEl.value.trim()) {
      alert("请先输入你的答案再提交打分哦！");
      return;
    }

    // 登录与额度检查
    var user = getCurrentUser();
    if (!user) {
      alert("请先登录或联系微信充值");
      return;
    }
    var credits = getUserCredits(user);
    if (credits <= 0) {
      alert("您的额度已用完，请联系微信充值或获取更多额度");
      return;
    }

    var userAnswer = inputEl.value.trim();
    submitBtn.disabled = true;
    submitBtn.innerText = "⏳ 阅卷老师打分中...";
    resultBox.style.display = "block";
    resultBox.innerHTML =
      "<p style='color: #666; margin: 0;'>AI 正在对照采分点分析您的回答...</p>";

    try {
      // 主接口：腾讯云云函数；备用接口：Cloudflare Worker（主接口故障时自动切换）
      var PRIMARY_URL =
        "[https://1426932475-m4no4tyy6o.ap-shanghai.tencentscf.com](https://1426932475-m4no4tyy6o.ap-shanghai.tencentscf.com)";
      var FALLBACK_URL = "https://haida-ai-grader.xiaojiaixin211.workers.dev/";
      var API_URLS = [PRIMARY_URL, FALLBACK_URL];

      var requestBody = JSON.stringify({
        title: question ? question.title : "考研主观题",
        analysis: question ? question.analysis || question.answer || "" : "",
        max_score: question ? question.max_score || 10 : 10,
        user_answer: userAnswer,
      });

      var response = null;
      var lastFetchError = null;

      for (var i = 0; i < API_URLS.length; i++) {
        try {
          response = await fetch(API_URLS[i], {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          });
          if (response && response.ok) {
            break;
          }
          lastFetchError = new Error(
            "HTTP " + response.status + " from " + API_URLS[i],
          );
        } catch (error) {
          lastFetchError = error;
        }
      }

      if (!response || !response.ok) {
        throw lastFetchError || new Error("AI 批改服务返回异常");
      }

      var data = await response.json();

      if (data.error) {
        resultBox.innerHTML =
          "<p style='color: #dc3545; margin: 0;'>" + data.error + "</p>";
      } else {
        // 扣减一次额度
        try {
          var remaining = Math.max(0, getUserCredits(user) - 1);
          setUserCredits(user, remaining);
          toast("已扣除 1 次额度，剩余：" + remaining + " 次");
        } catch (e) {
          console.warn("扣减额度失败", e);
        }

        var hitHtml =
          data.hit_points && data.hit_points.length > 0
            ? data.hit_points.join("；")
            : "无明显命中";
        var missHtml =
          data.miss_points && data.miss_points.length > 0
            ? data.miss_points.join("；")
            : "无遗漏";

        resultBox.innerHTML =
          '<div style="font-size: 16px; font-weight: bold; color: #28a745; margin-bottom: 8px;">🎯 得分：' +
          data.score +
          " / " +
          data.max_score +
          " 分</div>" +
          '<div style="margin-bottom: 6px; font-size: 13px; color: #212529;"><strong>✅ 命中得分点：</strong> ' +
          hitHtml +
          "</div>" +
          '<div style="margin-bottom: 6px; font-size: 13px; color: #dc3545;"><strong>❌ 遗漏/错误采分点：</strong> ' +
          missHtml +
          "</div>" +
          '<div style="background: #ffffff; padding: 8px 10px; border-radius: 4px; font-size: 13px; color: #495057; border: 1px solid #e9ecef; margin-top: 6px;"><strong>💡 阅卷点评：</strong>' +
          data.feedback +
          "</div>";
      }
    } catch (err) {
      resultBox.innerHTML =
        "<p style='color: #dc3545; margin: 0;'>网络请求失败，请稍后再试。</p>";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "🤖 AI 智能批改打分";
      updateUserInfoUI();
    }
  }

  window.submitForAIGrade = submitForAIGrade;

  var allQuestions = [];

  fetch("questions.json")
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      allQuestions = data;
      console.log("题目数据加载成功，共 " + allQuestions.length + " 题");
    })
    .catch(function (error) {
      console.error("加载 questions.json 失败:", error);
    });

  function filterQuestions() {
    var searchInput = document.getElementById("searchInput");
    var resultsList = document.getElementById("resultsList");
    if (!searchInput || !resultsList) return;

    var keyword = searchInput.value.trim().toLowerCase();
    resultsList.innerHTML = "";
    if (!keyword) return;

    var filtered = allQuestions.filter(function (q) {
      var matchTitle = q.title && q.title.toLowerCase().includes(keyword);
      var matchTags =
        q.tags &&
        q.tags.some(function (tag) {
          return tag.toLowerCase().includes(keyword);
        });
      return matchTitle || matchTags;
    });

    if (filtered.length === 0) {
      resultsList.innerHTML =
        '<div style="padding: 10px; color: #888;">未找到相关题目</div>';
      return;
    }

    filtered.forEach(function (q) {
      var item = document.createElement("div");
      item.className = "search-result-item";
      item.style.padding = "8px 12px";
      item.style.cursor = "pointer";
      item.style.borderBottom = "1px solid #eee";
      item.innerHTML =
        "<strong>" +
        q.title +
        '</strong> <span style="color:#666; font-size:12px;">[' +
        (q.subject || "未分类") +
        "]</span>";

      item.onclick = function () {
        var categoryNavBtn = document.querySelector('[data-target="category"]');
        if (categoryNavBtn) categoryNavBtn.click();

        setTimeout(function () {
          var subjectName = q.subject;
          if (subjectName) {
            var allButtons = document.querySelectorAll(
              "button, .subject-btn, .tag, a",
            );
            var clicked = false;
            allButtons.forEach(function (el) {
              var text = el.textContent ? el.textContent.trim() : "";
              if (!clicked && text.includes(subjectName) && text.length < 15) {
                el.click();
                clicked = true;
              }
            });
          }
        }, 200);

        setTimeout(function () {
          var targetElement =
            document.getElementById("question-" + q.id) ||
            document.getElementById(q.id) ||
            document.querySelector('[data-id="' + q.id + '"]') ||
            Array.from(
              document.querySelectorAll("div, section, article, li"),
            ).find(function (el) {
              return (
                el.textContent &&
                el.textContent.includes(q.title) &&
                el.textContent.length < 500
              );
            });

          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            targetElement.style.transition = "background-color 0.5s ease";
            targetElement.style.backgroundColor = "#fff3cd";
            setTimeout(function () {
              targetElement.style.backgroundColor = "";
            }, 2000);
          }
        }, 600);

        var searchInputAgain = document.getElementById("searchInput");
        var resultsListAgain = document.getElementById("resultsList");
        if (searchInputAgain) searchInputAgain.value = "";
        if (resultsListAgain) resultsListAgain.innerHTML = "";
      };
      resultsList.appendChild(item);
    });
  }

  window.filterQuestions = filterQuestions;

  async function handleCardAIGrade(btn) {
    var card = btn.closest(".q-card");
    if (!card) return;
    var uid = card.dataset.uid;
    var q = null;
    for (var i = 0; i < state.all.length; i++) {
      if (state.all[i].uid === uid) {
        q = state.all[i];
        break;
      }
    }
    if (!q) return;

    var inputEl = card.querySelector(".card-answer-input");
    var resultBox = card.querySelector(".card-ai-result");
    var submitBtn = btn;

    if (!inputEl || !inputEl.value.trim()) {
      alert("请先输入你的答案再提交打分哦！");
      return;
    }

    // 登录与额度检查
    var user = getCurrentUser();
    if (!user) {
      alert("请先登录或联系微信充值");
      return;
    }
    var credits = getUserCredits(user);
    if (credits <= 0) {
      alert("您的额度已用完，请联系微信充值或获取更多额度");
      return;
    }

    var userAnswer = inputEl.value.trim();
    submitBtn.disabled = true;
    submitBtn.innerText = "⏳ 阅卷老师打分中...";
    resultBox.style.display = "block";
    resultBox.innerHTML =
      "<p style='color: #666; margin: 0;'>AI 正在对照采分点分析您的回答...</p>";

    try {
      // 主接口：腾讯云云函数；备用接口：Cloudflare Worker（主接口故障时自动切换）
      var WORKER_URLS = [
        "https://my-exam-app-d2gzree0ob314c962-1426932475.ap-shanghai.app.tcloudbaseapp.com/ai-grader",
        "https://haida-ai-grader.xiaojiaixin211.workers.dev/",
        "https://haida-ai-grader.xiaojiaixin211.workers.dev/api/grade",
        "https://haida-ai-grader.xiaojiaixin211.workers.dev/grade",
      ];

      var response = null;
      var lastFetchError = null;
      var requestBody = JSON.stringify({
        title: q.title,
        analysis: q.analysis || "",
        max_score: 10,
        user_answer: userAnswer,
      });

      for (var i = 0; i < WORKER_URLS.length; i++) {
        try {
          response = await fetch(WORKER_URLS[i], {
            method: "POST",
            mode: "cors",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: requestBody,
          });
          if (response && response.ok) {
            break;
          }
          lastFetchError = new Error(
            "HTTP " + response.status + " from " + WORKER_URLS[i],
          );
        } catch (error) {
          lastFetchError = error;
        }
      }

      if (!response || !response.ok) {
        throw lastFetchError || new Error("AI 批改服务返回异常");
      }

      var data = await response.json();

      if (data.error) {
        resultBox.innerHTML =
          "<p style='color: #dc3545; margin: 0;'>" + data.error + "</p>";
      } else {
        // 扣减一次额度
        try {
          var remaining = Math.max(0, getUserCredits(user) - 1);
          setUserCredits(user, remaining);
          toast("已扣除 1 次额度，剩余：" + remaining + " 次");
        } catch (e) {
          console.warn("扣减额度失败", e);
        }

        var hitHtml =
          data.hit_points && data.hit_points.length > 0
            ? data.hit_points.join("；")
            : "无明显命中";
        var missHtml =
          data.miss_points && data.miss_points.length > 0
            ? data.miss_points.join("；")
            : "无遗漏";

        resultBox.innerHTML =
          '<div style="font-size: 16px; font-weight: bold; color: #28a745; margin-bottom: 8px;">🎯 得分：' +
          data.score +
          " / " +
          data.max_score +
          " 分</div>" +
          '<div style="margin-bottom: 6px; font-size: 13px; color: #212529;"><strong>✅ 命中得分点：</strong> ' +
          hitHtml +
          "</div>" +
          '<div style="margin-bottom: 6px; font-size: 13px; color: #dc3545;"><strong>❌ 遗漏/错误采分点：</strong> ' +
          missHtml +
          "</div>" +
          '<div style="background: #ffffff; padding: 8px 10px; border-radius: 4px; font-size: 13px; color: #495057; border: 1px solid #e9ecef; margin-top: 6px;"><strong>💡 阅卷点评：</strong>' +
          data.feedback +
          "</div>";
      }
    } catch (err) {
      resultBox.innerHTML =
        "<p style='color: #dc3545; margin: 0;'>网络请求失败，请稍后再试。</p>";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "🤖 AI 智能批改打分";
      updateUserInfoUI();
    }
  }

  window.handleCardAIGrade = handleCardAIGrade;

  // ---------- Activation code helpers ----------
  function loadUsedActivationCodes() {
    try {
      return JSON.parse(localStorage.getItem("hndx_used_codes") || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveUsedActivationCodes(arr) {
    localStorage.setItem("hndx_used_codes", JSON.stringify(arr));
  }
  function isActivationCodeUsed(code) {
    return loadUsedActivationCodes().indexOf(code) !== -1;
  }
  function markActivationCodeUsed(code) {
    var a = loadUsedActivationCodes();
    if (a.indexOf(code) === -1) {
      a.push(code);
      saveUsedActivationCodes(a);
    }
  }
  // ---------- Activation code core logic ----------
  // 1. 动态识别激活码类型的函数
  function findActivation(code) {
    if (!code || typeof code !== "string") return null;
    var cleanCode = code.trim();

    if (cleanCode.startsWith("MONTH-")) {
      return { code: cleanCode, type: "month" };
    } else if (cleanCode.startsWith("PERM-")) {
      return { code: cleanCode, type: "permanent" };
    }

    return null;
  }

  // 2. 核心兑换逻辑函数
  // month -> set VIP expiry +30 days; perm -> mark user as permanent in localStorage
  function redeemActivationCode(code) {
    var user = getCurrentUser();
    if (!user) return { success: false, message: "请先登录后再使用激活码" };
    if (!code || typeof code !== "string")
      return { success: false, message: "请输入有效的激活码" };

    var found = findActivation(code.trim());
    if (!found) return { success: false, message: "无效激活码" };
    if (isActivationCodeUsed(code.trim()))
      return { success: false, message: "该激活码已被使用" };

    if (found.type === "month") {
      try {
        var curExp = getUserVipExpiry(user) || 0;
        var base = curExp > Date.now() ? curExp : Date.now();
        var newExp = base + 30 * 24 * 60 * 60 * 1000; // 30 天
        localStorage.setItem("hndx_user_vip_" + user, String(newExp));
        markActivationCodeUsed(code.trim());
        updateUserInfoUI();
        return {
          success: true,
          message: "月卡激活成功：已开通/延长 30 天会员",
        };
      } catch (e) {
        return { success: false, message: "处理激活码时发生错误" };
      }
    } else if (found.type === "permanent") {
      try {
        localStorage.setItem("hndx_user_vip_" + user, "permanent");
        markActivationCodeUsed(code.trim());
        updateUserInfoUI();
        return {
          success: true,
          message: "永久会员激活成功：已享受永久免费使用",
        };
      } catch (e) {
        return { success: false, message: "处理激活码时发生错误" };
      }
    }

    return { success: false, message: "未知激活码类型" };
  }

  // expose helper to global for console usage
  window.redeemActivationCode = redeemActivationCode;
  window.loadUsedActivationCodes = loadUsedActivationCodes;
  window.ACTIVATION_CODES = window.ACTIVATION_CODES || ACTIVATION_CODES || [];
})();

// 3. 按钮点击精准绑定
(function () {
  window.addEventListener("DOMContentLoaded", function () {
    var submitBtn = document.getElementById("activation-code-submit");
    if (submitBtn) {
      submitBtn.onclick = function (e) {
        e.preventDefault();
        var currentInput =
          document.getElementById("activation-code-input") ||
          document.querySelector("#member-modal input, .modal-content input");
        var code = currentInput ? currentInput.value.trim() : "";
        if (!code) {
          alert("请输入激活码！");
          return;
        }
        var result = redeemActivationCode(code);
        if (result && result.message) {
          alert(result.message);
        }
        if (result && result.success) {
          location.reload();
        }
      };
    }
  });
})();
