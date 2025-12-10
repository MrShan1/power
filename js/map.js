import { getCapacityRadius } from './utils.js';
import { fuelTypeMap, countries, countryCenters, baseLayerTypes } from './consts.js';
import { getCountryGeo } from './requests.js';

let map = null;
let plantFeatures = null;
let plantVectorSource = null;
let heatLayer = null;
export let plantOverlay = null;
const countryGeoCache = Object.create(null); // 国家边界数据缓存

// 初始化地图
function init(targetElement) {
  map = createMap(targetElement);

  // 添加基础图层
  for (let mapType in baseLayerTypes) {
    const layers = baseLayerTypes[mapType].layers;
    for (let layerType of layers) {
      const layer = createBaseMapLayer(layerType);
      map.addLayer(layer);
    }
  }

  // 默认展示卫星图层
  // const layerIds = baseLayerTypes['satellite'].layers;
  // showLayers(layerIds);
}

// 创建地图实例
function createMap(targetElement = '') {
  // 创建2D地图
  const map = new ol.Map({
    target: targetElement,
    loadTilesWhileAnimating: true, // 执行动画时也加载瓦片
    controls: ol.control.defaults({
      // zoom: false, // 不显示缩放按钮
      rotate: false, // 不显示旋转按钮
      attribution: false // 不显示地图贡献者
    }),
    view: new ol.View({
      //center : ol.proj.transform([ 106, 30 ], 'EPSG:4326', 'EPSG:3857'), // 初始中心位置为在中国北京
      center: ol.proj.fromLonLat([106, 30]), // 初始中心位置为在中国北京
      // extent : [0, -300 , 600, 300],
      zoom: 2.5,
      minZoom: 2.5,
      maxZoom: 19.5
    })
  });

  return map;
}

// 创建卫星图底图
function createBaseMapLayer(layerType) {
  const layer = new ol.layer.Tile({
    id: layerType,
    baseLayer: true,
    source: new ol.source.XYZ({
      url: getMapUrl(layerType)
      // wrapX: false
    }),
    visible: false
  });
  return layer;
}

// 获取天地图相关的地图url
function getMapUrl(type) {
  const tk = '8a896a74ef4379f9f9d5a86dd308ba18';
  const url = `http://t0.tianditu.com/DataServer?T=${type}&x={x}&y={y}&l={z}&tk=${tk}`; // 天地图 - 本地
  // const url = `/tianditu/DataServer?T=${type}&x={x}&y={y}&l={z}&tk=${tk}`; // 天地图 - 线上代理
  return url;
}

// 展示指定图层
export function showLayers(layerIds) {
  const layers = getLayerById(layerIds);
  layers.forEach((layer) => {
    layer.setVisible(true);
  });
}

// 隐藏指定图层
export function hideLayers(layerIds) {
  const layers = getLayerById(layerIds);
  layers.forEach((layer) => {
    layer.setVisible(false);
  });
}

// 添加根据id获取目标图层方法
function getLayerById(layerIds = []) {
  const result = [];
  const layers = map.getLayers();
  for (let i = 0, len = layers.getLength(); i < len; i++) {
    const layer = layers.item(i);
    const id = layer.get('id');
    if (layerIds.includes(id)) {
      result.push(layer);
    }
  }
  return result;
}

// 创建GeoJson矢量地图
function createVectorMapLayerForJson() {
  const layer = new ol.layer.Vector({
    // 矢量图图层
    id: 'vector',
    renderMode: 'image', // 渲染模式，“image”模式性能较好
    source: new ol.source.Vector({
      url: '/data/countries.geojson',
      format: new ol.format.GeoJSON()
    }),
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(55, 130, 197, 0.3)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 112, 210, 0.2)',
        width: 3
      })
    })
  });
  return layer;
}

// 创建WRI的卫星地图
function createStreetMapLayerForWRI() {
  const sku = '101IlnJ2tChAj';
  const token = 'pk.eyJ1IjoicmVzb3VyY2V3YXRjaCIsImEiOiJjbHNueDk3bWEwOGZ6MmtvZzl2YXZzb2J5In0.URzmdOxvgu10vLNAgsh4dg'; // wri
  const url = `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.webp?sku=${sku}&access_token=${token}`;
  const layer = new ol.layer.Tile({
    id: 'satellite',
    baseLayer: true,
    source: new ol.source.XYZ({ url })
    // visible: false
  });
  return layer;
}

// 加载发电厂数据
export function loadMapData(points) {
  // 获取全球发电厂数据，并创建对应的特征点
  plantFeatures = creatPowerPlantFeatures(points);

  // 创建基础数据资源
  plantVectorSource = new ol.source.Vector();
  plantVectorSource.addFeatures(plantFeatures);

  // 添加热力图层
  heatLayer = createHeatLayer(plantVectorSource);
  heatLayer.setVisible(true); // 初始化时显示热力图
  map.addLayer(heatLayer);

  // 添加标记点图层
  const pointLayer = createPointLayer(plantVectorSource);
  pointLayer.setVisible(false);
  map.addLayer(pointLayer);

  // 监听地图缩放，切换热力图和标记点显示
  const view = map.getView();
  view.on('change:resolution', function (_e) {
    const showPoint = view.getZoom() >= 5;
    heatLayer.setVisible(!showPoint);
    pointLayer.setVisible(showPoint);
  });

  // 添加发电厂信息提示框
  plantOverlay = createPlantOverlay();
  map.addOverlay(plantOverlay);

  // 监听鼠标点击操作，展示信息提示框
  map.on('singleclick', function (e) {
    const map = e.map;
    const coord = e.coordinate;
    const pixelFeatures = map.getFeaturesAtPixel(e.pixel);
    // const overlay = map.getOverlayById('plantInfo');
    const overlay = plantOverlay;

    // 隐藏提示框
    overlay.hide();

    // 只为发电厂标记点展示提示框
    if (pixelFeatures != null && pixelFeatures.length > 0) {
      const feature = pixelFeatures[0];
      if (feature.get('data')) {
        // roamToPlantPoint(feature, coord);
        roamToPlantPoint(feature); // 直接使用特征点位置，鼠标位置不准确
      }
    }
  });
}

// 创建热力图层
function createHeatLayer(vectorSource) {
  const layer = new ol.layer.Heatmap({
    id: 'heat',
    renderMode: 'image',
    blur: 15,
    radius: 10,
    // 使用聚簇数据源对数据进行分箱
    source: new ol.source.Cluster({
      distance: 10,
      source: vectorSource
    }),
    weight: function (clusterFeature) {
      // 获取聚簇特征点包含的原始数据数量，使用数量作为权重值
      const features = clusterFeature.getProperties().features;
      return features ? features.length : 1;
    }
  });
  return layer;
}

// 添加热力图层
export function addHeatLayer() {
  map.addLayer(heatLayer);
}

// 移除热力图层
export function removeHeatLayer() {
  map.removeLayer(heatLayer);
}

// 创建聚簇图层
function createClusterLayer(vectorSource) {
  const layer = new ol.layer.Vector({
    id: 'cluster',
    renderMode: 'image',
    source: new ol.source.Cluster({
      distance: 100,
      source: vectorSource
    })
  });
  return layer;
}

// 创建标记点图层
function createPointLayer(vectorSource) {
  const styleCache = {}; // 缓存style，提高style利用率，提升性能
  const layer = new ol.layer.Vector({
    id: 'point',
    renderMode: 'image',
    source: vectorSource,
    style: function (feature) {
      const { fuel, capacity } = feature.get('data');
      const color = fuelTypeMap.get(fuel).color;
      const radius = getCapacityRadius(capacity);
      const key = `${fuel}-${radius}`;
      const style =
        styleCache[key] ||
        new ol.style.Style({
          image: new ol.style.Circle({
            fill: new ol.style.Fill({
              color: color
            }),
            radius
          })
        });
      styleCache[key] = style;
      return styleCache[key];
    }
  });
  return layer;
}

// 使用发电厂数据批量创建特征点
function creatPowerPlantFeatures(points) {
  const features = [];
  for (const p of points) {
    const lonLat = [p.lon, p.lat];
    const feature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat(lonLat)),
      data: p
    });
    feature.setId(p.id);
    features.push(feature);
  }
  return features;
}

// 根据筛选条件更新图层数据源
export function updateVectorSource(fuelTypes) {
  const visibleFeatures = [];
  for (let f of plantFeatures) {
    const fuel = f.get('data').fuel;
    if (fuelTypes.includes(fuel)) {
      visibleFeatures.push(f);
    }
  }
  plantVectorSource.clear();
  plantVectorSource.addFeatures(visibleFeatures);
}

// 添加发电厂信息提示框
function createPlantOverlay() {
  // 添加提示框
  const $overlay = $('<div class="plant-info-overlay ol-popup"></div>');
  const overlay = new ol.Overlay({
    id: 'plantInfo',
    element: $overlay[0],
    offset: [1.5, 1],
    position: undefined,
    positioning: 'bottom-center'
  });

  // 设置提示框显示内容
  overlay.setHtml = function (fields) {
    const html = fields.reduce(
      (str, { name, val }) => `${str}  
      <div class="plant-info-field">
        <div class="plant-info-name">${name}</div>
        <div class="plant-info-val">${val}</div>
      </div>`,
      ''
    );
    $overlay.html(html);
  };

  // 展示提示框
  overlay.show = function (fields, coord) {
    this.setHtml(fields);
    this.setPosition(coord);
  };

  // 隐藏提示框
  overlay.hide = function () {
    this.setPosition(undefined);
  };

  return overlay;
}

// 视图漫游至指定位置
function roamToPoint(coord, opts = {}, callback) {
  const view = map.getView();
  const extent = view.calculateExtent();

  // 如果视图已经放大，并且目标位置在当前视图范围内，则不执行缩放
  let zoom = view.getZoom();
  opts.zoom = opts.zoom || 8;
  if (zoom < opts.zoom || ol.extent.containsCoordinate(extent, coord) === false) {
    zoom = opts.zoom;
  }

  // 执行视图漫游动画
  view.animate(
    {
      center: coord,
      zoom: zoom,
      easing: ol.easing.inAndOut, // 动画平移方式：慢-快-慢
      duration: 1000
    },
    callback
  );
}

// 视图漫游至指定发电厂位置，并显示信息提示框
export function roamToPlantPoint(feature, coord) {
  if (!feature) return;
  if (typeof feature === 'string') {
    feature = plantVectorSource.getFeatureById(feature); // 根据ID获取特征点
    if (!feature) return;
  }

  const overlay = map.getOverlayById('plantInfo');
  overlay.hide();

  coord = coord || feature.getGeometry().getCoordinates();
  roamToPoint(coord, { zoom: 10 }, () => {
    const data = feature.get('data');
    const country = countries[data.country];
    const fields = [
      { name: '国家', val: `${country[1]} (${country[0]})` },
      { name: '发电厂名称', val: data.name },
      { name: '资源类型', val: fuelTypeMap.get(data.fuel).name },
      { name: '容量', val: `${data.capacity}兆瓦` },
      { name: '所属者', val: data.owner || '-' }
    ];

    overlay.show(fields, coord);
  });
}

// 视图漫游至指定国家位置，并显示信息提示框
export async function roamToCountryPoint(countryCode, callback) {
  let countryGeo = countryGeoCache[countryCode];
  if (!countryGeo) {
    try {
      // 首次请求时，从WRI的API接口获取国家边界数据
      const res = await getCountryGeo(countryCode);
      countryGeo = res.data;
      countryGeoCache[countryCode] = countryGeo; // 缓存国家边界数据
    } catch (error) {
      console.log('获取国家边界数据异常！', error);
      return;
    }
  }

  // 计算国家边界范围和合适的缩放级别
  const view = map.getView();
  const bbox = countryGeo.attributes.bbox; // 国家边界范围 [west, south, east, north]
  // const extent = ol.proj.transformExtent(bbox, 'EPSG:4326', 'EPSG:3857');
  const extent = ol.proj.transformExtent(bbox, 'EPSG:4326', view.getProjection());
  const resolution = view.getResolutionForExtent(extent, map.getSize()) * 1.1; // 预留部分边距
  const zoom = Math.min(view.getZoomForResolution(resolution), 12); // 最多放大到12级

  // 计算国家边界的中心点
  // 若目标为美国或俄罗斯等国家，中心点可能出现错位问题，手动指定中心点位置
  let coord = ol.extent.getCenter(extent);
  if (countryCenters[countryCode]) {
    coord = ol.proj.fromLonLat(countryCenters[countryCode]);
  }

  // 执行视图漫游
  roamToPoint(coord, { zoom }, callback);
}

init('mapBox');
