
const HARD_CONTROL_TYPES = ['silence', 'stun', 'knockup', 'suppression'];

class ControlEffect {
  constructor() { this.effects = []; }
  // 同类控制叠加取最长持续时间，不重复入队，避免重复暂停/恢复
  add(type, duration) {
    const existing = this.effects.find(e => e.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      existing.remaining = Math.max(existing.remaining, duration);
      return;
    }
    this.effects.push({ type, duration, remaining: duration });
  }
  update(dt) {
    for (const e of this.effects) e.remaining -= dt;
    this.effects = this.effects.filter(e => e.remaining > 0);
  }
  has(type) { return this.effects.some(e => e.type === type); }
  hasAny(types) { return this.effects.some(e => types.includes(e.type)); }
  isHardControlled() { return this.hasAny(HARD_CONTROL_TYPES); }
  // 距离最近一个硬控结束还剩多少真实时间
  minHardRemaining() {
    let min = Infinity;
    for (const e of this.effects) {
      if (HARD_CONTROL_TYPES.includes(e.type)) min = Math.min(min, e.remaining);
    }
    return min;
  }
}

module.exports = { ControlEffect, HARD_CONTROL_TYPES };
