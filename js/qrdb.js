const domParser = new DOMParser();

const processJuFaGeShi = (lines=[]) => {
  let dict = {};
  let idx = null;
  let pattern = null;
  let examples = null;
  for (let line of lines) {
    if (line[0]=="S") {
      [idx, pattern] = line.split(/:|：/).map(x=>x.trim());
    };
    if (line[0]=="如") {
      examples = line.split(/如:|如：/)[1].split(/\||｜/).map(x=>x.trim());
      dict[idx] = {idx: idx, pattern: pattern, examples: examples};
      idx = null;
      pattern = null;
      examples = null;
    };
  };
  return dict;
};

const processYuYiJueSe = (lines=[]) => {
  let dict = {};
  for (let line of lines) {
    if (line.length) {
      let lineSpans = line.split(/:|：/).map(x=>x.trim());
      let linePair = [lineSpans[0], lineSpans.slice(1,lineSpans.length).join("：")];
      let key = linePair[0];
      let value = linePair[1].split(/;|；/).filter(x=>x.length>0);
      if (key !== "单位UNI" && key !== "构成CON") {
        value = value.map(x=>x.replace(/([，；。、])?等+([。；])?$/, ""));
        value = value.map(x=>x.split(/[、，\,]/).map(y=>y.trim()).filter(y=>y.length>0));
        value = value.filter(x=>x.length>0);
        // value = value.map(x=>x.split(/[、，\,]/).map(y=>y.trim()).filter(y=>y.length>0));
        // value = value.map(x=>x.replace(/([，；。、])?等+([。；])?$/, "").split(/[、，\,]/).map(x=>x.trim()));
        // value = value.filter(x=>x.length>0);
        if (value.length == 1) {
          value = value[0];
        };
      };
      if (key === "单位UNI") {
        dict["单位UNI__"] = (value.length == 1) ? value[0] : value;
        // console.log(value);
        let uniPairs = value.map(x=>x.replace(/([，；。、])?等+([。；])?$/, "").split(/:|：/));
        let uniList = [];
        for (let pair of uniPairs) {
          // console.log(pair);
          if (pair.length === 2) {
            uniList.push({unitType: pair[0], examples: pair[1]?.split(/[、，\,]/).map(x=>x.trim())});
          } else if (pair.length === 1) {
            let xxs = pair[0]?.split(/[、，\,]/).map(x=>x.trim());
            if (xxs.length > 1) {
              uniList.push({examples: xxs});
            } else if (xxs.length === 1) {
              uniList.push({UNKNOWN: xxs[0]});
            };
          };
        };
        value = uniList;
      };
      if (key === "构成CON") {
        // dict["构成CON__"] = value;
      };
      dict[key] = value;
    };
  };
  return dict;
};

const processCiLeiShuXing = (lines=[]) => {
  lines = lines.flat(Infinity);
  let cat = lines[0];
  cat = cat.trim();
  cat = cat.replace(/ +|　+|\t+/g, " ");
  cat = cat.replace(/\|/g, "｜");
  cat = cat.replace(/\//g, "／");
  cat = cat.replace(/，|,/g, "、");
  cat = cat.replace(/、|／/g, "｜");
  cat = cat.replace(/词/g, "");
  // cat = cat.replace(/名/g, "");
  let array = cat.split("｜").map(x=>x.trim());
  return array;
};

async function parseQRDB(html) {
  const domParser = new DOMParser();
  const dom = domParser.parseFromString(html, "text/html");
  const tbody = dom.getElementsByTagName("tbody")[0];
  const tdPairs = [...tbody.children].map(x=>[...x.children].map(x=>x.innerText)).filter(x=>x.length==2);
  const dict = {};
  for (let pair of tdPairs) {
    let key = pair[0].replace(/：/, "");
    let value = pair[1].split("\n").filter(x=>x.length>0);
    // if (value.length == 1) {value = value[0]};
    dict[key] = value;
  };
  dict['syntaxPatterns'] = processJuFaGeShi(dict['句法格式']);
  dict['semanticRoles'] = processYuYiJueSe(dict['语义角色']);
  dict['categories'] = processCiLeiShuXing(dict['词类属性']);
  let result = dict;
  return result;
};

function getLinksOfQRDB() {
  let links = [];
  for (let it of Object.values(QRDB.dict)) {
    let node0 = {word: it["词目"][0], cats: it.categories};
    const kks = ["功用TEL", "处置HAN", "形式FOR", "评价EVA"];
    for (let kk of kks) {
      for (let wd of (it?.semanticRoles?.[kk]?.flat(Infinity)??[])) {
        let node1 = {word: wd, role: kk};
        let link = {
          node0: node0,
          node1: node1,
          edge: {label: `Item-Role[${kk}]`},
        };
        links.push(link);
      };
    };
  };
  return(links);
};





function innerKeyWords(text, keywords=[]) {
  keywords = Array.from(new Set(keywords));
  let list = [];
  for (let keyword of keywords) {
    if (text.includes(keyword)) {
      list.push(keyword);
    };
  };
  return list;
};
function innerQrdbKeyWords(text) {
  return innerKeyWords(text, Object.keys(QRDB.dict));
};
function innerQrdbKeyObjects(text) {
  return innerQrdbKeyWords(text).map(it=>QRDB.dict?.[it]);
};
function innerQrdbKeyObjectsDict(text) {
  let objects = innerQrdbKeyObjects(text);
  let dict = {};
  for (let obj of objects) {
    dict[obj.词目] = obj;
  };
  return dict;
};





const QRDB = {};
