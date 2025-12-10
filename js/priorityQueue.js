// 手写优先队列
export default class PriorityQueue {
  static DEFAULT_FUNC = (a, b) => {
    return a > b;
  };

  constructor(arr, comparator) {
    this.heap = null;
    this.fn = comparator || PriorityQueue.DEFAULT_FUNC;
    this.createHeap(arr);
  }

  getParent(i) {
    return Math.floor((i - 1) / 2);
  }

  getLeft(i) {
    return i * 2 + 1;
  }

  getRight(i) {
    return i * 2 + 2;
  }

  createHeap(arr) {
    this.heap = Array.isArray(arr) ? arr.slice() : [];
    const lastParent = this.getParent(this.heap.length - 1);
    for (let i = lastParent; i >= 0; --i) {
      this.shiftDown(i);
    }
  }

  shiftDown(i) {
    const size = this.heap.length;
    let child = this.getLeft(i);
    while (child < size) {
      if (child + 1 < size && this.fn(this.heap[child], this.heap[child + 1])) {
        child++;
      }
      if (this.fn(this.heap[i], this.heap[child])) {
        this.swap(i, child);
        i = child;
        child = this.getLeft(i);
      } else {
        break;
      }
    }
  }

  shiftUp(i) {
    let parent = this.getParent(i);
    while (parent >= 0) {
      if (this.fn(this.heap[parent], this.heap[i])) {
        this.swap(i, parent);
        i = parent;
        parent = this.getParent(i);
      } else {
        break;
      }
    }
  }

  swap(a, b) {
    const tmp = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = tmp;
  }

  push(val) {
    this.heap.push(val);
    this.shiftUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length <= 1) {
      return this.heap.pop();
    }

    const res = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.shiftDown(0);
    return res;
  }

  peek() {
    return this.heap[0];
  }

  size() {
    return this.heap.length;
  }
}
