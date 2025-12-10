// Cesium使用许可证
// olCesium上的许可证
// Cesium.Ion.defaultAccessToken =
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ZWVhYmU0Mi1jNTZkLTQ3OGItYmUxYS00YTMyMDQyZTMwNDkiLCJpZCI6NjQ1LCJpYXQiOjE2MDYxMjE2OTF9.zQibbf5P0-moQ8KiV_K7KMtyLHbR-VlPghj8lyqWduU'
Cesium.Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NDRmMjVmYS0zNzBiLTQ2NTYtOWY2Yy0wMDM4MmE4YWVjMGIiLCJpZCI6MzQ4MTkyLCJpYXQiOjE3NTk4NzU2ODl9.FPSpWfjLRIddBHCMHYhr56VGx9FLIHtGupIk02G-rMQ';

// 初始化3D地图
export function init3DMap(targetElement, map) {
  const map3D = create3DMap(targetElement, map);

  map3D.setEnabled(true); // 启用地图
  // map3D.setEnabled(false); // 禁用地图

  // const scene = map3D.getCesiumScene();
  // const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
  // listenClick(map3D, handler);
  // listenMouseMove(map3D, handler);
  return map3D;
}

// 构建3D视图
function create3DMap(targetElement = '', map2D = null) {
  // 创建3D视图
  const map3D = new olcs.OLCesium({
    target: targetElement,
    map: map2D
  });

  // 配置场景
  const scene = map3D.getCesiumScene(); // 3d地图场景
  scene.terrainProvider = Cesium.createWorldTerrain(); // 构建3d地图场景
  scene.screenSpaceCameraController.minimumZoomDistance = 500; // 最小缩放距离
  scene.screenSpaceCameraController.maximumZoomDistance = 30000000; // 最大缩放距离
  scene.getOlPosition = function (position) {
    // 获取openlayer坐标
    const ellipsoid = this.globe.ellipsoid;
    const cartesian = this.camera.pickEllipsoid(position, ellipsoid); // 获取笛卡尔坐标
    let coord = null;
    if (cartesian) {
      // 将笛卡尔坐标转换为地理坐标
      const cartographic = ellipsoid.cartesianToCartographic(cartesian);

      // 将弧度转为度的十进制度表示
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);

      // 获取openlayer坐标
      coord = ol.proj.fromLonLat([lon, lat]);
    }
    return coord;
  };

  return map3D;
}

// 监听点击交互操作
function listenClick(map3D, handler) {
  // 监听3D视图的点击交互操作，点击对象时，旋转视图，将对象定位至视野中央
  handler.setInputAction(function (movement) {
    const scene = map3D.getCesiumScene();
    const pickedPrimitive = scene.pick(movement.position);
    if (pickedPrimitive) {
      const olPosition = scene.getOlPosition(movement.position); // 获取ol坐标
      if (olPosition) {
        // 地球旋转至目标对象所在位置
        const feature = pickedPrimitive.primitive.olFeature;
        // rotatesToTarget(feature, true, olPosition, ...)
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// 监听鼠标移动操作
function listenMouseMove(map3D, handler) {
  handler.setInputAction(function (movement) {
    const map = map3D.getOlMap();

    // 在鼠标位置显示提示框
    const scene = map3D.getCesiumScene();
    const pickedPrimitive = scene.pick(movement.endPosition);
    if (pickedPrimitive) {
      const olPosition = scene.getOlPosition(movement.endPosition); // 获取ol坐标
      if (olPosition) {
        const coord = olPosition;
        const feature = pickedPrimitive.primitive.olFeature;
        // 只为矢量图层和标记点图层的对象展示提示框
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}
