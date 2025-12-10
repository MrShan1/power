import countrieData from '../data/countries.js';

// 资源类型列表
export const fuelTypes = [
  ['Coal', '煤', 'rgb(0, 0, 0)'],
  ['Oil', '石油', 'rgb(177, 89, 40)'],
  ['Gas', '天然气', 'rgb(188, 128, 189)'],
  ['Hydro', '水力', 'rgb(31, 120, 180)'],
  ['Nuclear', '核能', 'rgb(227, 26, 28)'],
  ['Solar', '太阳能', 'rgb(255, 127, 0)'],
  ['Waste', '垃圾焚烧', 'rgb(106, 61, 154)'],
  ['Wind', '风能', 'rgb(92, 162, 209)'],
  ['Geothermal', '地热', 'rgb(253, 191, 111)'],
  ['Biomass', '生物质能', 'rgb(34, 154, 0)'],
  ['Others', '其他', 'rgb(178, 223, 138)'] // Cogeneration, Storage, Other
];

// 资源类型map
export const fuelTypeMap = new Map();
for (let [type, name, color] of fuelTypes) {
  fuelTypeMap.set(type, { name, color });
}

// 容量等级
export const capacityLevels = [
  [100, 3],
  [500, 4],
  [1000, 5],
  [4000, 7],
  [7000, 9],
  [10000, 11],
  [Infinity, 13]
];

// 国家数据
export const countries = countrieData;

// 国家中心点坐标
// 这些国家的中心点位置出现错位问题，进行人工修正
export const countryCenters = {
  USA: [-98.286982, 40.715913], // 美国
  RUS: [90.179467, 64.552478] // 俄罗斯
};

// 基础地图分类
export const baseLayerTypes = {
  vector: { name: '矢量图', layers: ['vec_w', 'cva_w'] }, // 矢量图的底图和注记
  satellite: { name: '卫星图', layers: ['img_w', 'cia_w'] }, // 卫星图的底图和注记
  terrain: { name: '地形图', layers: ['ter_w', 'cta_w'] } // 地形图的底图和注记
};
