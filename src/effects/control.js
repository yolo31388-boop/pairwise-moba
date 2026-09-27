
class ControlEffect {
  constructor() { this.effects = []; }
  add(type, duration) { this.effects.push({type, duration, remaining: duration}); }
  update(dt) {
    for (const e of this.effects) e.remaining -= dt;
    this.effects = this.effects.filter(e => e.remaining > 0);
  }
  has(type) { return this.effects.some(e => e.type === type); }
}

module.exports = { ControlEffect };
