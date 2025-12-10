import { fuelTypes, fuelTypeMap, countries, baseLayerTypes } from './consts.js';
import { toLonLat, createPriorityQueue, debounce } from './utils.js';
import * as requests from './requests.js';
import * as mapinstance from './map.js';

// 资源类型管理
const fuel = {};
fuel.$list = $('.fuel-list');
fuel.$list.buildHtml = function (data) {
  const html = data.reduce(
    (str, [type, name, color]) => `${str}  
      <li class="fuel-item" data-fuel="${type}">
        <span class="fuel-color" style="background-color: ${color}"></span>
        <span class="fuel-name">${name}</span>
      </li>`,
    ''
  );
  return html;
};
fuel.$list.on('click', '.fuel-item', function (_e) {
  $(this).toggleClass('fuel-item--disabled');
  const enabledFuels = fuel.getEnabledFuels();
  fuel.$list.trigger('updateData', enabledFuels);
});
fuel.loadData = function (fuelTypes) {
  const content = fuel.$list.buildHtml(fuelTypes);
  fuel.$list.html(content);
};
fuel.getEnabledFuels = function () {
  const fuels = fuel.$list
    .find('.fuel-item')
    .not('.fuel-item--disabled')
    .map((_i, item) => $(item).data('fuel'));
  return fuels;
};
fuel.loadData(fuelTypes);

// 检索功能管理
const search = {};
search.$text = $('.search-text');
search.$result = $('.search-result');
search.$resultList = $('.search-result-list');
search.$resultList.matchText = function (text) {
  const countries = search.$resultList.matchTextForCountry(text);
  const plants = search.$resultList.matchTextForPlant(text);
  const results = [...countries, ...plants];
  let content = search.$resultList.buildHtmlForNoResult();
  if (results.length > 0) {
    content = search.$resultList.buildHtml(results);
  }
  search.$resultList.html(content);
};
search.$resultList.matchTextForCountry = function (text) {
  const pq = createPriorityQueue(2, (a, b) => a.score > b.score); // 获取相似度最高的2条数据
  for (let code in countries) {
    if (!map.countryFuels[code]) continue;
    const [enName, cnName] = countries[code];
    const scoreEn = search.calculateSimilarity(enName, text); // 计算英文名称相似度得分
    const scoreCn = search.calculateSimilarity(cnName, text); // 计算中文名称相似度得分
    const score = Math.max(scoreEn, scoreCn);
    if (score > 0.7) {
      pq.push({ score, info: { code, enName, cnName } });
    }
  }
  const list = pq.toArray().map((item) => item.info);
  return list.map((info) => ({
    id: info.code,
    type: 'Country',
    name: `${info.cnName} (${info.enName})`,
    color: 'transparent'
  }));
};
search.$resultList.matchTextForPlant = function (text) {
  const pq = createPriorityQueue(10, (a, b) => a.score > b.score); // 获取相似度最高的10条数据
  const enabledFuels = Array.from(fuel.getEnabledFuels());
  for (let p of map.plantPoints) {
    if (!enabledFuels.includes(p.fuel)) continue; // 只能检索显示的资源类型
    const score = search.calculateSimilarity(p.name, text); // 计算名称相似度得分
    if (score > 0.3) {
      pq.push({ score, p });
    }
  }
  const list = pq.toArray().map((item) => item.p);
  return list.map((p) => ({
    id: p.id,
    type: p.fuel,
    name: p.name,
    color: fuelTypeMap.get(p.fuel).color
  }));
};
search.$resultList.buildHtml = function (data) {
  const html = data.reduce(
    (str, result) => `${str}
      <li class="search-result-item text-ellipsis" data-type="${result.type}" data-id="${result.id}" title="${result.name}">
        <span class="search-result-color" style="background-color: ${result.color}"></span>
        <span class="search-result-name">${result.name}</span>
      </li>`,
    ''
  );
  return html;
};
search.$resultList.buildHtmlForNoResult = function () {
  const html = `
      <li class="search-result-item search-result-item--noresult">
        <span class="search-result-name">未检索到信息。</span>
      </li>`;
  return html;
};
search.$resultList.on('click', '.search-result-item', function (_e) {
  // 定位新的目标时，先隐藏所有弹出信息层
  map.plantOverlay.hide();
  country.hide();

  const type = $(this).data('type');
  const id = $(this).data('id');
  if (!type || !id) return;

  // 将检索信息回填至检索框内
  // const searchText = type === 'Country' ? countries[id][1] : $(this).find('.search-result-name').text();
  // search.$text.val(searchText);
  // search.$text.trigger('input');

  if (type === 'Country') {
    // 漫游至到国家位置，并显示信息
    map.inst.roamToCountryPoint(id, () => {
      country.show(id);
    });
  } else {
    // 漫游至到发电厂位置，并显示信息
    map.inst.roamToPlantPoint(id);
  }
});
search.calculateSimilarity = function (target, search) {
  if (!target || !search) return 0;
  target = target.toLowerCase();
  search = search.toLowerCase();
  if (target === search) return 1;
  if (target.includes(search)) {
    const match = search.length / target.length; // 相似度得分
    const index = 1 - target.indexOf(search) / target.length; // 匹配位置得分
    const similarity = match * 0.7 + index * 0.3; // 综合得分
    return similarity;
  }
  return 0;
}; // 计算字符串相似度得分，返回0~1之间的数值，数值越大表示越相似
search.listenTextChange = function () {
  const handleInput = debounce(() => {
    const text = search.$text.val().trim();
    if (text !== '') {
      search.$resultList.matchText(text);
      search.$result.show();
    } else {
      search.$result.hide();
    }
  }, 300);
  search.$text.on('input', handleInput);
};
search.listenTextChange();

// 地图管理
const map = { inst: mapinstance };
map.loadData = async function () {
  const points = map.normalizeData(await requests.getPowerPlantPoints());
  map.plantPoints = points;
  map.inst.loadMapData(points);
  map.countryFuels = map.calculateCountryFuels(points); // 计算国家发电资源，并进行分类汇总
  map.plantOverlay = map.inst.plantOverlay;
};
map.normalizeData = function (plantPoints) {
  const result = [];
  for (const p of plantPoints) {
    const lonLat = toLonLat(p.lon, p.lat);
    if (!lonLat) {
      console.log('经纬度转换异常！', lonLat);
      continue;
    }

    // 标准化数据
    p.fuel = fuelTypeMap.get(p.fuel) ? p.fuel : 'Others'; // 能源类型
    p.lon = lonLat[0]; // 经度
    p.lat = lonLat[1]; // 纬度
    p.capacity = Number(p.capacity) || 0; // 容量
    result.push(p);
  }
  return result;
};
map.listenDataChange = function () {
  fuel.$list.on('updateData', function (_e, fuels) {
    fuels = Array.from(fuels);
    map.inst.updateVectorSource(fuels);
  });
};
map.calculateCountryFuels = function (points) {
  const countryFuels = Object.create(null);
  for (const p of points) {
    let country = countryFuels[p.country];
    if (!country) {
      country = countryFuels[p.country] = Object.create(null);
    }
    let fuel = country[p.fuel];
    if (!fuel) {
      fuel = country[p.fuel] = {
        count: 0,
        capacity: 0
      };
    }
    fuel.count += 1;
    fuel.capacity += p.capacity;
  }
  return countryFuels;
};
map.loadData();
map.listenDataChange();

// 国家信息面板管理
const country = {};
country.$container = $('.country-container');
country.$name = $('.country-name');
country.$fuels = $('.country-fuel-table tbody');
country.$fuels.buildHtml = function (fuels) {
  let html = '';
  for (let [fuelType, name, color] of fuelTypes) {
    const fuelInfo = fuels[fuelType];
    if (!fuelInfo) continue;
    html += `
      <tr>
        <td><span class="country-fuel-color" style="background-color: ${color}"></span>${name}</td>
        <td>${fuelInfo.count}</td>
        <td>${Math.round(fuelInfo.capacity * 100) / 100}</td>
      </tr>
    `;
  }
  return html;
};
country.$close = $('.country-container-close');
country.$close.on('click', function () {
  country.hide();
});
country.show = function (countryCode) {
  const [en, cn] = countries[countryCode];
  const fuels = map.countryFuels[countryCode];
  if (!fuels) return;

  // 更新国家名称
  country.$name.text(`${cn} (${en})`);

  // 更新资源表格
  const html = country.$fuels.buildHtml(fuels);
  country.$fuels.html(html);

  country.$container.show();
};
country.hide = function () {
  country.$container.hide();
};

// 地图图层管理
const mapLayer = {};
mapLayer.$baseLayers = $('.base-map-layers');
mapLayer.$baseLayers.buildHtml = function (layerTypes) {
  let html = '';
  for (let type in layerTypes) {
    const layerName = layerTypes[type].name;
    html += `
      <li class="map-layer">
        <label class="map-layer-name"><input type="radio" name="base" data-type="${type}"/> ${layerName}</label>
      </li>
    `;
  }
  return html;
};
mapLayer.$baseLayers.on('click', 'input', function () {
  // 隐藏所有图层
  for (let type in baseLayerTypes) {
    const layerIds = baseLayerTypes[type].layers;
    map.inst.hideLayers(layerIds);
  }
  // 显示当前图层
  const type = $(this).data('type');
  const layerIds = baseLayerTypes[type].layers;
  map.inst.showLayers(layerIds);
});
// mapLayer.$dataLayers = $('.data-map-layers');
// mapLayer.$dataLayers.on('click', 'input', function () {
//   const checked = $(this).prop('checked');
//   if (checked) {
//     map.inst.addHeatLayer();
//   } else {
//     map.inst.removeHeatLayer();
//   }
// });
mapLayer.init = function () {
  const html = mapLayer.$baseLayers.buildHtml(baseLayerTypes);
  mapLayer.$baseLayers.html(html);
  mapLayer.$baseLayers.find('input[data-type="satellite"]').click(); // 默认显示卫星图层
};
mapLayer.init();
