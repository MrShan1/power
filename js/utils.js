import { capacityLevels } from './consts.js';
import PriorityQueue from './priorityQueue.js';

// 转换经纬度字符串
export function toLonLat(lon, lat) {
  if (isNaN(lon) || isNaN(lat)) {
    return null;
  }
  return [parseFloat(lon), parseFloat(lat)];
}

// 获取发电厂容量对应的圆形半径
export function getCapacityRadius(capacity) {
  let radius = 0;
  for (let [n, r] of capacityLevels) {
    if (capacity < n) {
      radius = r;
      break;
    }
  }
  return radius;
}

// 创建优先队列
export function createPriorityQueue(size, comparator) {
  const pq = new PriorityQueue(null, comparator);
  pq.maxSize = size;
  pq.push = function (val) {
    if (this.size() < this.maxSize) {
      PriorityQueue.prototype.push.call(this, val);
    } else if (this.fn(val, this.peek()) > 0) {
      this.pop();
      PriorityQueue.prototype.push.call(this, val);
    }
  };
  pq.toArray = function () {
    const arr = [];
    for (let v of this.heap) {
      arr.push(v);
    }
    arr.sort((a, b) => this.fn(b, a)); // 降序排列
    return arr;
  };
  return pq;
}

// 函数节流
export function throttle(fn, delay) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// 函数防抖
export function debounce(fn, delay) {
  let timeout = null;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
