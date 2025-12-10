import { initMap, loadMapData } from './map.js';
import { init3DMap } from './map3D.js';

const target = 'mapBox';
const map = initMap(target);
const map3D = init3DMap(target, map);

loadMapData(map);

// 添加根据id获取目标图层方法
map.getLayer = function (id) {
  var result = null;
  var layers = this.getLayers();

  // 根据id获取目标图层
  for (var i = 0, len = layers.getLength(); i < len; i++) {
    var layer = layers.item(i);
    if (layer.get('id') === id) {
      result = layer;
      break;
    }
  }

  return result;
};
// 使用3d时需要重新填充标记点层
map.getView().on('change:resolution', function (event) {
  if (map3D.getEnabled()) {
    var source = map.getLayer('heat').getSource();
    var features = source.getFeatures();
    source.clear();
    source.addFeatures(features);
  }
});

window.map3D = map3D;
window.map = map;
